import { App } from 'electron'
import logger from '../global-shared/logger'
import { valueToEnum } from '../global-shared/util'
import { listen, listenSync, close as closeListeners } from './main-listener'
import LndClient from './lnd'
import LndEngine from '../global-shared/lnd-engine'
import { AnchorEngine } from '../global-shared/anchor-engine'
import {
  Nullable,
  EngineBalances,
  Asset,
  Engine,
  Transaction
} from '../global-shared/types'
import { ConnectionConfig } from '../global-shared/types/lnd'
import { asAmount } from '../global-shared/currency-conversions'
import {
  AlertEvent,
  WireUnsavedRecurringBuy,
  WireQuote,
  RequestChannelStatus
} from '../common/types'
import {
  deserializeQuoteFromWire,
  deserializeUnsavedRecurringBuyFromWire,
  serializeRecurringBuyToWire
} from '../common/serializers'
import * as store from './data'
import { Database } from 'better-sqlite3'
import { AnchorClient } from './anchor'
import { executeTrade, retryPendingTrades } from './trade'
import { getAuth } from './auth'
import { openLink, showNotification } from './util'
import { WEBVIEW_PRELOAD_PATH } from './electron-security'
import { createTransactionReport } from './create-transaction-report'
import { requestChannel } from './request-channel'

interface Engines {
  BTC: LndEngine,
  USDX: AnchorEngine,
  [symbol: string]: Engine
}

export class Router {
  private db: Database;
  private lndClient: LndClient;
  private anchorClient: AnchorClient;
  private shouldRetryPendingTrades = true;

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

    // We ONLY retry pending trades on initialization of the application to prevent
    // an edge case where trades will be in both failed/success states. This is due
    // to block timing that causes the engine to go from a valid to an invalid (not synced)
    // state. This callback would then be triggered and would successfully retry a trade
    // after we've already marked it failed.
    if (this.shouldRetryPendingTrades) {
      this.shouldRetryPendingTrades = false
      await retryPendingTrades(this.db, this.engines)
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

  private getBalances (asset: Asset): Promise<Nullable<EngineBalances>> {
    if (asset === Asset.USDX && !this.anchorClient.isConfigured()) {
      return new Promise((resolve) => resolve({
        total: asAmount(Asset.USDX, 0),
        available: asAmount(Asset.USDX, 0),
        holds: asAmount(Asset.USDX, 0)
      }))
    }

    const engine = this.getEngineSafe(asset)

    if (!engine || !engine.validated) {
      return new Promise((resolve) => resolve(null))
    }

    return engine.getBalances()
  }

  private getTransactions (asset: Asset): Promise<Transaction[]> {
    const engine = this.getEngineSafe(asset)

    if (!engine || !engine.validated) {
      // shim for a promise since engine.getTransactions returns one
      return new Promise(resolve => resolve([]))
    }

    return engine.getTransactions()
  }

  private requestChannel (): Promise<RequestChannelStatus> {
    const lndEngine = this.getEngineSafe(Asset.BTC) as LndEngine

    if (!lndEngine || !lndEngine.validated) {
      return new Promise(resolve => resolve(RequestChannelStatus.FAILED))
    }

    return requestChannel(lndEngine)
  }

  listen (): void {
    listen('lnd:connect', (config: ConnectionConfig) => this.lndClient.manualConnect(config))
    listen('lnd:scan', () => this.lndClient.scan())
    listen('lnd:getStatus', () => this.lndClient.getStatus())
    listenSync('lnd:getConnectionConfig', () => this.lndClient.getConnectionConfig())
    listen('lnd:getPaymentChannelNetworkAddress', () => this.lndClient.engine.getPaymentChannelNetworkAddress())
    listen('lnd:payInvoice', (paymentRequest: string) => this.lndClient.engine.payInvoice(paymentRequest))
    listen('lnd:decodePaymentRequest', (request: string) => this.lndClient.engine.decodePaymentRequest(request))
    listen('lnd:getChannels', () => this.lndClient.engine.getChannels())
    listen('lnd:getAlias', (publicKey: string) => this.lndClient.engine.getAlias(publicKey))
    listen('lnd:closeChannel', ({ channelPoint, force }: { channelPoint: string, force: boolean }) => {
      return this.lndClient.engine.closeChannel(channelPoint, force)
    })
    listen('getBalances', (asset: string) => this.getBalances(valueToEnum(Asset, asset)))
    listen('getTransactions', (asset: string) => this.getTransactions(valueToEnum(Asset, asset)))
    listen('openLink', ({ link }: { link: string}) => openLink(link))
    listen('trade:execute', (quote: WireQuote) => executeTrade(this.db, this.engines, deserializeQuoteFromWire(quote)))
    listen('trade:getTrades', ({ limit, olderThanTradeId }: { limit: number, olderThanTradeId?: number }) => store.getTrades(this.db, olderThanTradeId, limit))
    listen('trade:getTrade', ({ id }: { id: number }) => store.getTrade(this.db, id))
    listen('auth:getAuth', () => getAuth())
    listen('anchor:startDeposit', () => this.anchorClient.startDeposit())
    listenSync('getWebviewPreloadPath', () => WEBVIEW_PRELOAD_PATH)
    listen('pok:hasShown', () => store.hasShownProofOfKeys(this.db))
    listen('pok:markShown', () => store.markProofOfKeysShown(this.db))
    listen('dca:addRecurringBuy', (recurringBuy: WireUnsavedRecurringBuy) =>
      store.addRecurringBuy(this.db, deserializeUnsavedRecurringBuyFromWire(recurringBuy)))
    listen('dca:removeRecurringBuy', (id: number) => store.removeRecurringBuy(this.db, id))
    listen('dca:getRecurringBuys', () => store.getRecurringBuys(this.db).map(serializeRecurringBuyToWire))
    listenSync('app:notification', (event: AlertEvent) => showNotification(event))
    listen('report:transactions', () => createTransactionReport(this.db))
    listen('requestChannel', () => this.requestChannel())
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
