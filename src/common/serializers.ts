import {
  RecurringBuy,
  WireRecurringBuy,
  Trade,
  TradeStatus,
  UnsavedRecurringBuy,
  WireUnsavedRecurringBuy
} from './types'
import { Amount, UnknownObject } from '../global-shared/types'

export function deserializeTradeFromWire (wireTrade: UnknownObject): Trade {
  return {
    id: wireTrade.id as number,
    status: wireTrade.status as TradeStatus,
    hash: wireTrade.hash as string,
    destinationAmount: wireTrade.destinationAmount as Amount,
    sourceAmount: wireTrade.sourceAmount as Amount,
    startTime: new Date(wireTrade.startTime as string),
    endTime: wireTrade.endTime ? new Date(wireTrade.endTime as string) : undefined
  }
}

export function serializeUnsavedRecurringBuyToWire (recurringBuy: UnsavedRecurringBuy): WireUnsavedRecurringBuy {
  return {
    amount: recurringBuy.amount,
    frequency: recurringBuy.frequency,
    referenceTime: recurringBuy.referenceTime.toISOString()
  }
}

export function deserializeUnsavedRecurringBuyFromWire (recurringBuy: WireUnsavedRecurringBuy): UnsavedRecurringBuy {
  return {
    amount: recurringBuy.amount,
    frequency: recurringBuy.frequency,
    referenceTime: new Date(recurringBuy.referenceTime)
  }
}

export function deserializeRecurringBuyFromWire (wireRecurringBuy: WireRecurringBuy): RecurringBuy {
  const partialRecurringBuy = deserializeUnsavedRecurringBuyFromWire(wireRecurringBuy)
  return {
    id: wireRecurringBuy.id,
    ...partialRecurringBuy
  }
}

export function serializeRecurringBuyToWire (recurringBuy: RecurringBuy): WireRecurringBuy {
  const partialWireRecurringBuy = serializeUnsavedRecurringBuyToWire(recurringBuy)
  return {
    id: recurringBuy.id,
    ...partialWireRecurringBuy
  }
}
