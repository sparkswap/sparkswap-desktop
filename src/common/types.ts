import { SwapHash, Amount, SwapPreimage } from '../global-shared/types'
import { ConnectionConfig } from '../global-shared/types/lnd'

export interface LndConfig extends ConnectionConfig {
  configured: boolean
}

export interface Quote {
  hash: SwapHash,
  destinationAmount: Amount,
  sourceAmount: Amount
}

export enum TradeFailureReason {
  UNKNOWN = 0,
  PREPARE_SWAP_ERROR = 1,
  SERVER_EXECUTE_ERROR = 2,
  PERMANENT_FORWARD_ERROR= 3
}

export enum TradeStatus {
  UNKNOWN,
  PENDING,
  COMPLETE,
  FAILED
}

export interface Trade extends Quote {
  id: number,
  startTime: Date,
  endTime?: Date,
  preimage?: SwapPreimage,
  failureCode?: TradeFailureReason,
  status: TradeStatus
}

export enum TimeUnit {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS'
}

const timeUnitEntries = Object.entries(TimeUnit)

export function valueToTimeUnit (str: string): TimeUnit {
  for (let i = 0; i < timeUnitEntries.length; i++) {
    if (timeUnitEntries[i][1] === str) {
      return TimeUnit[timeUnitEntries[i][0] as keyof typeof TimeUnit]
    }
  }
  throw new Error(`${str} is not a valid value for TimeUnit`)
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
