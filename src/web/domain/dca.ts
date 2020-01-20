import { EventEmitter } from 'events'
import { Nullable } from '../../global-shared/types'
import {
  Frequency,
  RecurringBuy,
  TimeUnit
} from '../../common/types'
import { requestQuote } from './quote'
import executeTrade from '../domain/trade'
import { getRecurringBuys } from './main-request'
import { ipcRenderer } from '../electron'
import { getNextTimeoutDuration, isStartOfInterval } from '../../common/utils'

export const recurringBuys: Map<number, RecurringBuy> = new Map()

let checkBuysTimeoutId: Nullable<NodeJS.Timeout> = null

const CHECK_BUYS_INTERVAL: Frequency = { interval: 1, unit: TimeUnit.MINUTES }

// We add a 30 second offset to account for the potential of a timeout firing slightly
// before the expected time, causing a false positive for a recurring buy.
// Each timeout will have an additional 30 seconds added, causing it to fire
// 30 seconds past the each minute
const CHECK_BUYS_OFFSET = 30 * 1000

// gets the number of milliseconds to the next time we'll check for scheduled buys
export function getCheckBuysTimeoutDuration (): number {
  return getNextTimeoutDuration(CHECK_BUYS_INTERVAL) + CHECK_BUYS_OFFSET
}

async function tryBuy (recurringBuy: RecurringBuy): Promise<void> {
  const quote = await requestQuote(recurringBuy.amount)
  await executeTrade(quote)
}

function shouldExecuteRecurringBuy (recurringBuy: RecurringBuy): boolean {
  return isStartOfInterval(recurringBuy.frequency, recurringBuy.referenceTime)
}

async function executeScheduledBuys (subscriber: EventEmitter): Promise<void> {
  const MAX_EXECUTE_ATTEMPTS = 3
  for (const buy of recurringBuys.values()) {
    if (shouldExecuteRecurringBuy(buy)) {
      for (let i = 0; i < MAX_EXECUTE_ATTEMPTS; i++) {
        try {
          await tryBuy(buy)
          subscriber.emit('success', 'Recurring buy completed')
          break
        } catch (e) {
          subscriber.emit('error', e)
        }
      }
    }
  }

  scheduleRecurringBuys(subscriber)
}

function stopRecurringBuys (): void {
  if (checkBuysTimeoutId) clearTimeout(checkBuysTimeoutId)
  checkBuysTimeoutId = null
}

async function loadRecurringBuys (): Promise<void> {
  recurringBuys.clear()
  const recurringBuysArr = await getRecurringBuys()
  recurringBuysArr.forEach(recurringBuy => recurringBuys.set(recurringBuy.id, recurringBuy))
}

function scheduleRecurringBuys (subscriber: EventEmitter): void {
  const timeoutDuration = getCheckBuysTimeoutDuration()
  checkBuysTimeoutId = setTimeout(() => executeScheduledBuys(subscriber), timeoutDuration)
}

async function resetRecurringBuys (subscriber: EventEmitter): Promise<void> {
  try {
    stopRecurringBuys()
    await loadRecurringBuys()
    subscriber.emit('update', recurringBuys)
    scheduleRecurringBuys(subscriber)
  } catch (e) {
    subscriber.emit('error', e)
  }
}

export function subscribeRecurringBuys (): EventEmitter {
  const subscriber = new EventEmitter()
  resetRecurringBuys(subscriber)
  ipcRenderer.on('recurringBuyUpdate', (_evt: Event): void => { resetRecurringBuys(subscriber) })

  return subscriber
}
