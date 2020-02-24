import {
  SwapHash,
  Amount,
  SwapPreimage,
  TransactionStatus
} from '../global-shared/types'
import { ConnectionConfig } from '../global-shared/types/lnd'

export interface LndConfig extends ConnectionConfig {
  configured: boolean
}

export interface Quote {
  hash: SwapHash,
  destinationAmount: Amount,
  sourceAmount: Amount,
  expiration: Date
}

export interface WireQuote {
  hash: string,
  destinationAmount: Amount,
  sourceAmount: Amount,
  expiration: string
}

export enum TradeFailureReason {
  UNKNOWN = 0,
  PREPARE_SWAP_ERROR = 1,
  SERVER_EXECUTE_ERROR = 2,
  PERMANENT_FORWARD_ERROR= 3
}

export type TradeStatus = TransactionStatus
export const TradeStatus = TransactionStatus

export interface Trade extends Quote {
  id: number,
  startTime: Date,
  endTime?: Date,
  preimage?: SwapPreimage,
  failureCode?: TradeFailureReason,
  status: TradeStatus
}

export interface WireTrade extends WireQuote {
  id: number,
  startTime: string,
  endTime?: string,
  preimage?: string,
  failureCode?: number,
  status: number
}

export enum TimeUnit {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS'
}

export interface Frequency {
  interval: number,
  unit: TimeUnit
}

export interface RecurringBuy {
  id: number,
  amount: Amount,
  frequency: Frequency,
  referenceTime: Date
}

export interface WireRecurringBuy {
  id: number,
  amount: Amount,
  frequency: Frequency,
  referenceTime: string
}

export type UnsavedRecurringBuy = Omit<RecurringBuy, 'id'>

export type WireUnsavedRecurringBuy = Omit<WireRecurringBuy, 'id'>

export interface AlertEvent {
  title: string,
  message: string
}

export interface WireTransaction {
  id: string,
  type: number,
  status: number,
  amount: Amount,
  date: string,
  fee: Amount
}
