import { EventEmitter } from 'events'
import { getNetworkTime } from './main-request'
import logger from '../../global-shared/logger'
import { BLOCK_BUFFER } from '../../global-shared/anchor-engine/anchor-engine'

const CHECK_SYNC_INTERVAL = 60 * 60 * 1000
export let isClockSynced = false

export const updater = new EventEmitter()

export async function checkClockSynced (): Promise<void> {
  try {
    const date = await getNetworkTime()
    const delta = ((new Date().getTime() - date.getTime())) / 1000
    logger.debug(`NTP clock delta ${delta}s`)

    // If the system clock is off by more than the block buffer used
    // to generate Anchor escrows, the trade will fail
    isClockSynced = Math.abs(delta) <= BLOCK_BUFFER
    updater.emit('update', isClockSynced)
  } catch (e) {
    logger.warn(`Unable to retrieve NTP time`)
  }
}

setInterval(() => checkClockSynced(), CHECK_SYNC_INTERVAL)
