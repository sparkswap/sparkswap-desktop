import LegacyEngine, {
  LndEngineClient as LegacyClient,
  Transaction as LegacyTransaction,
  Invoice as LegacyInvoice
} from 'lnd-engine'
import { Statuses } from '../types/lnd'
import { LoggerInterface } from '../logger'
import { payInvoice } from './pay-invoice'
import { createChannel, CreateChannelOptions } from './create-channel'
import { waitForSwapCommitment } from './wait-for-swap-commitment'
import { getBalances, Balances as LndBalances } from './get-balances'
import { getChannels } from './get-channels'
import { getChannelsForRemoteAddress } from './get-channels-for-remote-address'
import { getAlias } from './get-alias'
import { closeChannel } from './close-channel'
import { getTransactions } from './get-transactions'
import { Channel, Transaction } from '../types'

export { deadline } from './deadline'
export type LndEngineClient = LegacyClient
export type ChainTransaction = LegacyTransaction
export type DecodedPaymentRequest = LegacyInvoice
export type Balances = LndBalances

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
  getBalances (): Promise<Balances> {
    return getBalances({
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  getChannels (): Promise<Channel[]> {
    return getChannels({
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  getChannelsForRemoteAddress (address: string): Promise<Channel[]> {
    return getChannelsForRemoteAddress(address, {
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  getAlias (publicKey: string): Promise<string> {
    return getAlias(publicKey, {
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  closeChannel (channelPoint: string, force: boolean): Promise<string> {
    return closeChannel(channelPoint, force, {
      client: this.engine.client,
      logger: this.engine.logger
    })
  }
  getTransactions (): Promise<Transaction[]> {
    return getTransactions({
      client: this.engine.client,
      logger: this.engine.logger
    })
  }

  /* Modified from legacy */
  decodePaymentRequest (paymentRequest: string): Promise<DecodedPaymentRequest> {
    // Legacy `getInvoice` calls `decodePaymentRequest`
    return this.engine.getInvoice(paymentRequest)
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
  getTotalBalanceForAddress (address: string): Promise<string> {
    return this.engine.getTotalBalanceForAddress(address)
  }
  getChainTransactions (): Promise<ChainTransaction[]> {
    return this.engine.getChainTransactions()
  }
  getConfirmedBalance (): Promise<string> {
    return this.engine.getConfirmedBalance()
  }
  getUnconfirmedBalance (): Promise<string> {
    return this.engine.getUnconfirmedBalance()
  }
}
