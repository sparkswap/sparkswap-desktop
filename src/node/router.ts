import * as url from 'url'
import { shell, App } from 'electron'
import { listen, listenSync, close as closeListeners } from './main-listener'
import LndClient from './lnd'
import LndEngine from 'lnd-engine'
import { AnchorEngine } from '../global-shared/anchor-engine'
import { Amount, Asset, valueToAsset, assetToUnit } from '../global-shared/types'
import { ConnectionConfig } from '../global-shared/types/lnd'
import { Quote, Trade } from '../common/types'
import * as store from './data'
import { Database } from 'better-sqlite3'
import { AnchorClient } from './anchor'
import {
  executeTrade,
  retryPendingTrades
} from './trade'
import { getAuth } from './auth'

type Engine = LndEngine | AnchorEngine

interface Engines {
  BTC: LndEngine,
  USDX: AnchorEngine,
  [symbol: string]: Engine
}

// TODO: make a whitelist of links and use that instead of just enforcing https
function openLink (link: string): void {
  if (new url.URL(link).protocol === 'https:') {
    shell.openExternal(link)
  } else {
    console.warn(`tried to open insecure link: ${link}`)
  }
}

export class Router {
  private db: Database;

  private lndClient: LndClient;

  private anchorClient: AnchorClient;

  constructor () {
    this.db = store.initialize()
    store.setLastTradeUpdate(this.db)
    this.lndClient = new LndClient()
    this.anchorClient = new AnchorClient()

    this.lndClient.on('connect', async () => {
      try {
        await retryPendingTrades(this.db, this.engines)
      } catch (e) {
        console.error(`Error while retrying pending trades: ${e.message}`)
      }
    })
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

  private get engines (): Engines {
    return {
      [Asset.BTC]: this.getEngine(Asset.BTC) as LndEngine,
      [Asset.USDX]: this.getEngine(Asset.USDX) as AnchorEngine
    }
  }

  private async getBalance (asset: Asset): Promise<Amount> {
    const engine = this.getEngine(asset)

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

  private async getTrades (lastUpdate: Date): Promise<Trade[]> {
    const lastTradeUpdate = store.getLastTradeUpdate()
    if (lastTradeUpdate == null || lastUpdate < lastTradeUpdate) {
      return store.getTrades(this.db)
    }

    const trades: Trade[] = await new Promise(resolve => {
      store.tradeUpdater.once('change', () => {
        resolve(store.getTrades(this.db))
      })
    })

    return trades
  }

  listen (): void {
    listen('lnd:connect', (config: ConnectionConfig) => this.lndClient.manualConnect(config))
    listen('lnd:scan', () => this.lndClient.scan())
    listen('lnd:getStatus', () => this.lndClient.status)
    listenSync('lnd:getConnectionConfig', () => this.lndClient.getConnectionConfig())
    listen('lnd:getPaymentChannelNetworkAddress', () => this.lndClient.engine.getPaymentChannelNetworkAddress())
    listen('getBalance', (asset: string) => this.getBalance(valueToAsset(asset)))
    listen('openLink', ({ link }: { link: string}) => openLink(link))
    listen('trade:execute', (quote: Quote) => executeTrade(this.db, this.engines, quote))
    listen('trade:getTrades', (lastUpdate: number) => this.getTrades(new Date(lastUpdate)))
    listen('auth:getAuth', () => getAuth())
    listen('anchor:startDeposit', () => this.anchorClient.startDeposit())
  }

  close (): void {
    closeListeners()
    store.close(this.db)
  }
}

function startRouter (app: App): void {
  const router = new Router()

  app.on('ready', () => {
    router.listen()
  })

  app.on('will-quit', () => {
    router.close()
  })
}

export default startRouter
