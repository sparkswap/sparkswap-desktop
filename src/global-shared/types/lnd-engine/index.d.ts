
declare module 'lnd-engine' {
  type SwapHash = string
  type SwapPreimage = string
  type PaymentPreimage = string

  class SettledSwapError extends Error {}
  class CanceledSwapError extends Error {}
  class ExpiredSwapError extends Error {}
  class PermanentSwapError extends Error {}

  enum Statuses {
    UNKNOWN = 'UNKNOWN',
    NO_CONFIG = 'NO_CONFIG',
    LOCKED = 'LOCKED',
    NEEDS_WALLET = 'NEEDS_WALLET',
    UNAVAILABLE = 'UNAVAILABLE',
    UNLOCKED = 'UNLOCKED',
    NOT_SYNCED = 'NOT_SYNCED',
    OLD_VERSION = 'OLD_VERSION',
    VALIDATED = 'VALIDATED'
  }

  enum Errors {
    SettledSwapError,
    CanceledSwapError,
    ExpiredSwapError,
    PermanentSwapError
  }

  export interface Channel {
    active?: boolean,
    initiator?: boolean,
    capactiy: string,
    localBalance: string,
    remoteBalance: string
  }

  enum TransactionTypes {
    CHANNEL_OPEN = 'CHANNEL_OPEN',
    CHANNEL_CLOSE = 'CHANNEL_CLOSE',
    DEPOSIT = 'DEPOSIT',
    WITHDRAW = 'WITHDRAW',
    UNKNOWN = 'UNKNOWN'
  }

  interface Transaction {
    type: TransactionTypes,
    amount: string,
    transactionHash: string,
    blockHeight: number,
    timestamp: string,
    fees: string,
    pending: boolean
  }

  interface LoggerInterface {
    debug (message: string): void,
    info (message: string): void,
    warn (message: string): void,
    error (message: string): void
  }

  export interface Invoice {
    numSatoshis: string,
    destination: string
  }

  class LndEngine {
    static readonly STATUSES: {
      UNKNOWN: Statuses,
      NO_CONFIG: Statuses,
      LOCKED: Statuses,
      NEEDS_WALLET: Statuses,
      UNAVAILABLE: Statuses,
      UNLOCKED: Statuses,
      NOT_SYNCED: Statuses,
      OLD_VERSION: Statuses,
      VALIDATED: Statuses
    }

    static readonly ERRORS: {
      SettledSwapError: typeof SettledSwapError,
      CanceledSwapError: typeof CanceledSwapError,
      ExpiredSwapError: typeof ExpiredSwapError,
      PermanentSwapError: typeof PermanentSwapError
    }

    constructor(host: string, symbol: string, options: {
      tlsCertPath: string,
      macaroonPath: string,
      minVersion: string,
      logger?: LoggerInterface
    })

    host: string
    tlsCertPath: string
    macaroonPath: string
    status: Statuses
    logger: LoggerInterface
    readonly maxChannelBalance: number
    readonly validated: boolean
    readonly finalHopTimeLock: number
    readonly retrieveWindowDuration: number
    readonly claimWindowDuration: number
    readonly blockBuffer: number
    readonly quantumsPerCommon: number

    waitForSwapCommitment (hash: SwapHash): Promise<Date>
    getSettledSwapPreimage (hash: SwapHash): Promise<SwapPreimage>
    translateSwap (address: string, hash: SwapHash, amount: string, maxTime: Date): Promise<SwapPreimage>
    initiateSwap (address: string, hash: SwapHash, amount: string, maxTimeLock: number, finalDelta: number): Promise<SwapPreimage>
    cancelSwap (hash: SwapHash): Promise<void>
    settleSwap (preimage: SwapPreimage): Promise<void>
    prepareSwap (hash: SwapHash, amount: string, timeout: Date, finalCltvDelta: number): Promise<void>
    getPaymentChannelNetworkAddress (): Promise<string>
    connectUser (pubkey: string): Promise<void>
    createChannels (pubkey: string, amount: number, options?: { targetTime?: number, privateChan?: boolean }): Promise<void>
    getUncommittedBalance (): Promise<string>
    getTotalChannelBalance (): Promise<string>
    getTotalPendingChannelBalance (): Promise<string>
    getUncommittedPendingBalance (): Promise<string>
    getStatus (): Promise<Statuses>
    getChannelsForRemoteAddress (address: string): Promise<Channel[]>
    getTotalBalanceForAddress (address: string): Promise<string>
    getChainTransactions (): Promise<Transaction[]>
    payInvoice (paymentRequest: string): Promise<PaymentPreimage>
    getInvoice (paymentRequest: string): Promise<Invoice>
    getConfirmedBalance (): Promise<string>
    getUnconfirmedBalance (): Promise<string>
  }

  export default LndEngine
}
