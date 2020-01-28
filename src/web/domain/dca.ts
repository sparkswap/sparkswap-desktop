import { EventEmitter } from 'events'
import logger from '../../global-shared/logger'
import {
  Frequency,
  RecurringBuy,
  TimeUnit
} from '../../common/types'
import executeTrade from '../domain/trade'
import { getRecurringBuys } from './main-request'
import { ipcRenderer } from '../electron'
import { getNextTimeoutDuration, isStartOfInterval } from '../../common/utils'
import { requestQuote } from './quote'
import { delay } from '../../global-shared/util'
import { Nullable } from '../../global-shared/types'

let recurringBuysSubscriber: EventEmitter | undefined

let schedulerTimeout: NodeJS.Timeout | undefined

// These are buys that are currently executing, so they should not be executed again or removed from the UI
const executingBuys: Map<number, RecurringBuy> = new Map()

// These are all recurring buys that will be executed in the future
const scheduledBuys: Map<number, RecurringBuy> = new Map()

// This is the superset of scheduled and executing buys for updating the UI
export const recurringBuys = new Map([...scheduledBuys, ...executingBuys])

const CHECK_BUYS_INTERVAL: Frequency = { interval: 1, unit: TimeUnit.MINUTES }

// We add a 30 second offset to account for the potential of a timeout firing slightly
// before the expected time, causing a false positive for a recurring buy.
// Each timeout will have an additional 30 seconds added, causing it to fire
// 30 seconds past the each minute
const CHECK_BUYS_OFFSET = 30 * 1000

const EXECUTE_BUY_RETRY_ATTEMPTS = 3
const EXECUTE_BUY_RETRY_DELAY_MS = 2000

// gets the number of milliseconds to the next time we'll check for scheduled buys
export function getCheckBuysTimeoutDuration (): number {
  return getNextTimeoutDuration(CHECK_BUYS_INTERVAL) + CHECK_BUYS_OFFSET
}

function shouldExecuteRecurringBuy (recurringBuy: RecurringBuy): boolean {
  return isStartOfInterval(recurringBuy.frequency, recurringBuy.referenceTime)
}

function updateRecurringBuysMap (subscriber: EventEmitter): void {
  recurringBuys.clear()
  scheduledBuys.forEach(buy => recurringBuys.set(buy.id, buy))
  executingBuys.forEach(buy => recurringBuys.set(buy.id, buy))

  subscriber.emit('update', recurringBuys)
}

export async function executeRecurringBuyWithRetries (buy: RecurringBuy): Promise<void> {
  let retries = 0
  let error: Nullable<Error> = null

  do {
    try {
      await executeTrade(await requestQuote(buy.amount))
      error = null
    } catch (e) {
      logger.debug(`Failed to execute recurring buy ${buy.id}. Retrying in ${EXECUTE_BUY_RETRY_DELAY_MS} ms`)
      error = e
    }
  } while (error != null && retries++ < EXECUTE_BUY_RETRY_ATTEMPTS && await delay(EXECUTE_BUY_RETRY_DELAY_MS))

  if (error) {
    throw error
  }
}

async function executeScheduledBuys (subscriber: EventEmitter): Promise<void> {
  const buysToExecute = Array.from(scheduledBuys.values()).filter(buy => shouldExecuteRecurringBuy(buy))

  // We don't want to wait for each buy to complete, since the execution time may be long
  await Promise.all(buysToExecute.map(async (buy) => {
    if (executingBuys.has(buy.id)) {
      logger.debug(`Recurring buy ${buy.id} is currently executing. Skipping additional buy.`)
      return
    }

    try {
      executingBuys.set(buy.id, buy)
      subscriber.emit('executing:id', buy.id)
      subscriber.emit('executing')
      await executeRecurringBuyWithRetries(buy)
      subscriber.emit('success', 'Recurring buy completed')
      subscriber.emit('success:id', buy.id)
    } catch (e) {
      subscriber.emit('error', e)
      subscriber.emit('error:id', buy.id, e)
    } finally {
      executingBuys.delete(buy.id)
      updateRecurringBuysMap(subscriber)
    }
  }))
}

async function loadRecurringBuys (subscriber: EventEmitter): Promise<void> {
  try {
    const recurringBuysArr = await getRecurringBuys()

    scheduledBuys.clear()
    recurringBuysArr.forEach(buy => scheduledBuys.set(buy.id, buy))

    updateRecurringBuysMap(subscriber)
  } catch (e) {
    subscriber.emit('error', e)
  }
}

function scheduleRecurringBuys (subscriber: EventEmitter): void {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
  }

  schedulerTimeout = setTimeout(() => {
    executeScheduledBuys(subscriber)
    scheduleRecurringBuys(subscriber)
  }, getCheckBuysTimeoutDuration())
}

export function subscribeRecurringBuys (): EventEmitter {
  if (recurringBuysSubscriber) {
    return recurringBuysSubscriber
  }

  const subscriber = new EventEmitter()

  loadRecurringBuys(subscriber)
  ipcRenderer.on('recurringBuyUpdate', (_evt: Event): void => { loadRecurringBuys(subscriber) })

  scheduleRecurringBuys(subscriber)

  recurringBuysSubscriber = subscriber
  return recurringBuysSubscriber
}
