import LegacyEngine, {
  LndEngineClient as LegacyClient,
  Transaction as LegacyTransaction,
  Invoice as LegacyInvoice,
  Channel as LegacyChannel
} from 'lnd-engine'
import { Statuses } from '../types/lnd'
import { LoggerInterface } from '../logger'
import { payInvoice } from './pay-invoice'
import { createChannel, CreateChannelOptions } from './create-channel'
import { waitForSwapCommitment } from './wait-for-swap-commitment'

export { deadline } from './deadline'
export type LndEngineClient = LegacyClient
export type Transaction = LegacyTransaction
export type Invoice = LegacyInvoice
export type Channel = LegacyChannel

type SwapHash = string
type SwapPreimage = string

export default class LndEngine {
  static readonly ERRORS = LegacyEngine.ERRORS
  static readonly STATUSES = LegacyEngine.STATUSES

  private engine: LegacyEngine

  // unchanged instance properties (set in constructor)
  readonly maxChannelBalance: number
  readonly finalHopTimeLock: number
  readonly retrieveWindowDuration: number
  readonly claimWindowDuration: number
  readonly blockBuffer: number
  readonly quantumsPerCommon: number

  // get/set instance properties
  get host (): string {
    return this.engine.host
  }

  set host (host: string) {
    this.engine.host = host
  }

  get tlsCertPath (): string {
    return this.engine.tlsCertPath
  }

  set tlsCertPath (tlsCertPath: string) {
    this.engine.tlsCertPath = tlsCertPath
  }

  get macaroonPath (): string {
    return this.engine.macaroonPath
  }

  set macaroonPath (macaroonPath: string) {
    this.engine.macaroonPath = macaroonPath
  }

  get logger (): LoggerInterface {
    return this.engine.logger
  }

  set logger (logger: LoggerInterface) {
    this.engine.logger = logger
  }

  // getter only instance properties
  get status (): Statuses {
    return this.engine.status
  }

  get client (): LndEngineClient {
    return this.engine.client
  }

  get validated (): boolean {
    return this.engine.validated
  }

  constructor (host: string, symbol: string, options: {
    tlsCertPath: string,
    macaroonPath: string,
    minVersion: string,
    logger?: LoggerInterface
  }) {
    this.engine = new LegacyEngine(host, symbol, options)

    this.maxChannelBalance = this.engine.maxChannelBalance
    this.finalHopTimeLock = this.engine.finalHopTimeLock
    this.retrieveWindowDuration = this.engine.retrieveWindowDuration
    this.claimWindowDuration = this.engine.claimWindowDuration
    this.blockBuffer = this.engine.blockBuffer
    this.quantumsPerCommon = this.engine.quantumsPerCommon
  }

  /* Migrated */
  payInvoice (paymentRequest: string): Promise<void> {
    return payInvoice(paymentRequest, {
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  createChannel (paymentChannelNetworkAddress: string,
    fundingAmount: number, options: CreateChannelOptions): Promise<void> {
    return createChannel(paymentChannelNetworkAddress, fundingAmount, options, {
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  waitForSwapCommitment (hash: SwapHash, expiration: Date): Promise<void> {
    return waitForSwapCommitment(hash, expiration, {
      client: this.engine.client,
      logger: this.engine.logger
    })
  }

  /* Legacy Pass-thru */
  getSettledSwapPreimage (hash: SwapHash): Promise<SwapPreimage> {
    return this.engine.getSettledSwapPreimage(hash)
  }
  translateSwap (address: string, hash: SwapHash, amount: string, maxTime: Date): Promise<SwapPreimage> {
    return this.engine.translateSwap(address, hash, amount, maxTime)
  }
  initiateSwap (address: string, hash: SwapHash, amount: string, maxTimeLock: number, finalDelta: number): Promise<SwapPreimage> {
    return this.engine.initiateSwap(address, hash, amount, maxTimeLock, finalDelta)
  }
  cancelSwap (hash: SwapHash): Promise<void> {
    return this.engine.cancelSwap(hash)
  }
  settleSwap (preimage: SwapPreimage): Promise<void> {
    return this.engine.settleSwap(preimage)
  }
  prepareSwap (hash: SwapHash, amount: string, timeout: Date, finalCltvDelta: number): Promise<void> {
    return this.engine.prepareSwap(hash, amount, timeout, finalCltvDelta)
  }
  getPaymentChannelNetworkAddress (): Promise<string> {
    return this.engine.getPaymentChannelNetworkAddress()
  }
  connectUser (pubkey: string): Promise<void> {
    return this.engine.connectUser(pubkey)
  }
  getUncommittedBalance (): Promise<string> {
    return this.engine.getUncommittedBalance()
  }
  getTotalChannelBalance (): Promise<string> {
    return this.engine.getTotalChannelBalance()
  }
  getTotalPendingChannelBalance (): Promise<string> {
    return this.engine.getTotalPendingChannelBalance()
  }
  getUncommittedPendingBalance (): Promise<string> {
    return this.engine.getUncommittedPendingBalance()
  }
  getStatus (): Promise<Statuses> {
    return this.engine.getStatus()
  }
  getChannelsForRemoteAddress (address: string): Promise<Channel[]> {
    return this.engine.getChannelsForRemoteAddress(address)
  }
  getTotalBalanceForAddress (address: string): Promise<string> {
    return this.engine.getTotalBalanceForAddress(address)
  }
  getChainTransactions (): Promise<Transaction[]> {
    return this.engine.getChainTransactions()
  }
  getInvoice (paymentRequest: string): Promise<Invoice> {
    return this.engine.getInvoice(paymentRequest)
  }
  getConfirmedBalance (): Promise<string> {
    return this.engine.getConfirmedBalance()
  }
  getUnconfirmedBalance (): Promise<string> {
    return this.engine.getUnconfirmedBalance()
  }
}
