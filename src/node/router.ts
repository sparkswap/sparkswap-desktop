import * as path from 'path'
import { App } from 'electron'
import logger from '../global-shared/logger'
import { listen, listenSync, close as closeListeners } from './main-listener'
import LndClient from './lnd'
import LndEngine from 'lnd-engine'
import { AnchorEngine } from '../global-shared/anchor-engine'
import { Amount, Asset, Unit, valueToAsset, assetToUnit, Engine }
  from '../global-shared/types'
import { ConnectionConfig } from '../global-shared/types/lnd'
import { Quote } from '../common/types'
import * as store from './data'
import { Database } from 'better-sqlite3'
import { AnchorClient } from './anchor'
import { executeTrade, retryPendingTrades } from './trade'
import { getAuth } from './auth'
import { openLink } from './util'
import { delay } from '../global-shared/util'
import { getNetworkTime } from './data/ntp'

const RETRY_TRADE_DELAY = 10000

interface Engines {
  BTC: LndEngine,
  USDX: AnchorEngine,
  [symbol: string]: Engine
}

export class Router {
  private db: Database;

  private lndClient: LndClient;

  private anchorClient: AnchorClient;

  constructor () {
    this.db = store.initialize()
    const onValidated = (): void => { this.tryRetryPendingTrades() }
    this.anchorClient = new AnchorClient({ onValidated })
    this.lndClient = new LndClient({ onValidated })
  }

  private async tryRetryPendingTrades (): Promise<void> {
    if (!this.anchorClient || !this.lndClient) {
      logger.debug('Engine clients have not been initialized yet.')
      return
    }

    if (!this.anchorClient.validated || !this.lndClient.validated) {
      logger.debug('Waiting to retry pending trades. Not all engines are ' +
        `validated. LND: ${this.lndClient.validated} ANCHOR: ${this.anchorClient.validated}`)
      return
    }

    // We loop and continually retry pending trades because the engine can go
    // to a NOT_SYNCED state after validation.
    while (true) {
      try {
        await retryPendingTrades(this.db, this.engines)
        return
      } catch (e) {
        logger.error(`Error while retrying pending trades: ${e}`)
        await delay(RETRY_TRADE_DELAY)
      }
    }
  }

  // using a switch allows the engines getter to work even if one of the
  // engines has not been initialized and allows engines to maintain typing
  private getEngine (asset: Asset): Engine {
    switch (asset) {
      case Asset.BTC:
        return this.lndClient.engine
      case Asset.USDX:
        return this.anchorClient.engine
      default:
        throw new Error(`Unknown asset ${asset}`)
    }
  }

  private getEngineSafe (asset: Asset): Engine | null {
    try {
      return this.getEngine(asset)
    } catch (e) {
      return null
    }
  }

  private get engines (): Engines {
    return {
      [Asset.BTC]: this.getEngine(Asset.BTC) as LndEngine,
      [Asset.USDX]: this.getEngine(Asset.USDX) as AnchorEngine
    }
  }

  private async getBalance (asset: Asset): Promise<Amount | null> {
    if (asset === Asset.USDX && !this.anchorClient.isConfigured()) {
      return { asset: Asset.USDX, unit: Unit.Cent, value: 0 }
    }

    const engine = this.getEngineSafe(asset)

    if (!engine || !engine.validated) {
      return null
    }

    const balances = await Promise.all([
      engine.getUncommittedBalance(),
      engine.getTotalChannelBalance(),
      engine.getTotalPendingChannelBalance(),
      engine.getUncommittedPendingBalance()
    ])

    const totalBalance = balances.reduce((acc, bal) => parseFloat(bal) + acc, 0)

    return {
      value: totalBalance,
      asset,
      unit: assetToUnit(asset)
    }
  }

  listen (): void {
    listen('lnd:connect', (config: ConnectionConfig) => this.lndClient.manualConnect(config))
    listen('lnd:scan', () => this.lndClient.scan())
    listen('lnd:getStatus', () => this.lndClient.getStatus())
    listenSync('lnd:getConnectionConfig', () => this.lndClient.getConnectionConfig())
    listen('lnd:getPaymentChannelNetworkAddress', () => this.lndClient.engine.getPaymentChannelNetworkAddress())
    listen('lnd:payInvoice', (request: string) => this.lndClient.engine.payInvoice(request))
    listen('lnd:getInvoice', (request: string) => this.lndClient.engine.getInvoice(request))
    listen('getBalance', (asset: string) => this.getBalance(valueToAsset(asset)))
    listen('openLink', ({ link }: { link: string}) => openLink(link))
    listen('trade:execute', (quote: Quote) => executeTrade(this.db, this.engines, quote))
    listen('trade:getTrades', () => store.getTrades(this.db))
    listen('auth:getAuth', () => getAuth())
    listen('anchor:startDeposit', () => this.anchorClient.startDeposit())
    listenSync('getWebviewPreloadPath', () => path.join(__dirname, 'webview-preload.js'))
    listen('ntp:getTime', () => getNetworkTime())
  }

  close (): void {
    closeListeners()
    store.close(this.db)
  }
}

function startRouter (app: App): void {
  app.on('ready', () => {
    const router = new Router()

    router.listen()

    app.on('will-quit', () => {
      router.close()
    })
  })
}

export default startRouter
