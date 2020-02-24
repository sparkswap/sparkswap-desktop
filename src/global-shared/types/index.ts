import LndEngine, { Balances as InternalLndBalances } from '../lnd-engine'
import { AnchorEngine, Balances as InternalAnchorBalances } from '../anchor-engine'

export type LndBalances = InternalLndBalances
export type AnchorBalances = InternalAnchorBalances

export type Nullable<T> = null | T

export function isNotNull<T> (value: T): value is Exclude<T, null> {
  return value !== null
}

export type Engine = LndEngine | AnchorEngine

// SwapHashes are 32 byte SHA-256 hashes encoded as Base64 strings
export type SwapHash = string
// SwapPreimages are 32 bytes of randomness encoded as Base64 strings
export type SwapPreimage = string
export type URL = string

export type PaymentChannelNetworkAddress = string

export enum Asset {
  BTC = 'BTC',
  USDX = 'USDX'
}

export enum Unit {
  Cent = 'cent',
  Satoshi = 'satoshi'
}

const assetsToUnits = Object.freeze({
  [Asset.BTC]: Unit.Satoshi,
  [Asset.USDX]: Unit.Cent
})

export function assetToUnit (asset: Asset): Unit {
  return assetsToUnits[asset]
}

export interface Amount {
  asset: Asset,
  unit: Unit,
  value: number
}

export enum ReviewStatus {
  UNCREATED = 'UNCREATED',
  CREATED = 'CREATED',
  INCOMPLETE = 'INCOMPLETE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
}

const reviewStatuses: string[] = Object.values(ReviewStatus)

export function isReviewStatus (str: string): str is ReviewStatus {
  return reviewStatuses.includes(str)
}

export interface UnknownObject {
  [key: string]: unknown
}

export enum AnchorRegisterResult {
  SUCCESS = 'success',
  ADDITIONAL_FIELDS_NEEDED = 'additional_fields_needed'
}

export interface Auth {
  uuid: string,
  apiKey: string
}

export enum TransactionStatus {
  UNKNOWN,
  PENDING,
  COMPLETE,
  FAILED
}

export enum TransactionType {
  SEND,
  RECEIVE,
  PCN_SEND,
  PCN_RECEIVE,
  PCN_OPEN,
  PCN_COOP_CLOSE,
  PCN_FORCE_CLOSE,
  SWEEP,
  UNKNOWN
}

export interface Transaction {
  id: string,
  type: TransactionType,
  status: TransactionStatus,
  amount: Amount,
  date: Date,
  fee: Amount
}

export type EngineBalances = AnchorBalances | LndBalances

export enum ChannelStatus {
  PENDING_OPEN = 'PENDING_OPEN',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_COOP_CLOSE = 'PENDING_COOP_CLOSE',
  PENDING_FORCE_CLOSE = 'PENDING_FORCE_CLOSE',
  WAITING_CLOSE = 'WAITING_CLOSE',
  CLOSED = 'CLOSED'
}

export interface Channel {
  id: string,
  remoteAddress: string,
  status: ChannelStatus,
  localBalance: number,
  localReserve: number,
  remoteBalance: number,
  remoteReserve: number,
  // number of seconds from now we would need to wait to claim funds from a
  // force close
  forceCloseDelay?: number
}

export type NetworkType = 'anchor' | 'bolt'

export interface NetworkAddress {
  network: NetworkType,
  id: string,
  host?: string
}
