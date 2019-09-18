import { Engine, SwapHash } from './types'
import logger from './logger'
import { delay } from './util'

const CANCEL_NUM_RETRIES = 10
const CANCEL_RETRY_DELAY = 10000

export async function cancelSwapWithRetry (engine: Engine, hash: SwapHash):
Promise<void> {
  for (let i = 0; i < CANCEL_NUM_RETRIES; i++) {
    try {
      await engine.cancelSwap(hash)
      logger.info(`Canceled swap with hash ${hash}`)
      return
    } catch (e) {
      logger.warn(`Error canceling swap with hash ${hash}: ${e}`)
      await delay(CANCEL_RETRY_DELAY)
    }
  }
  logger.error(`Failed to cancel swap with hash ${hash}`)
}
