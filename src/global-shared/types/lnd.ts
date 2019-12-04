export interface ConnectionConfig {
  hostName: string,
  port: number,
  tlsCertPath: string,
  macaroonPath: string
}

export enum Statuses {
  UNKNOWN = 'UNKNOWN',
  LOCKED = 'LOCKED',
  NEEDS_WALLET = 'NEEDS_WALLET',
  UNAVAILABLE = 'UNAVAILABLE',
  UNLOCKED = 'UNLOCKED',
  NOT_SYNCED = 'NOT_SYNCED',
  OLD_VERSION = 'OLD_VERSION',
  VALIDATED = 'VALIDATED',
  // Custom type for UI
  NO_CONFIG = 'NO_CONFIG'
}

export enum TransactionTypes {
  CHANNEL_OPEN = 'CHANNEL_OPEN',
  CHANNEL_CLOSE = 'CHANNEL_CLOSE',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  UNKNOWN = 'UNKNOWN'
}
