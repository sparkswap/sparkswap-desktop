import { markProofOfKeysShown, hasShownProofOfKeys } from './main-request'
import logger from '../../global-shared/logger'
import { getProofOfKeys } from './server'
import { updater as historyUpdater } from './history'
import { TradeStatus } from '../../common/types'
import { EventEmitter } from 'events'

export let showProofOfKeys = false

export const updater = new EventEmitter()

const HISTORY_EVENT = `trade:${TradeStatus[TradeStatus.COMPLETE]}`
const PROOF_DATE = new Date('1/3/2020')

export async function doneWithProofOfKeys (): Promise<void> {
  showProofOfKeys = false
  updater.emit('update', showProofOfKeys)
  try {
    await markProofOfKeysShown()
  } catch (e) {
    logger.error(`Failed to mark proof of keys done: ${e}`)
  }
}

async function onTradeComplete (): Promise<void> {
  if (new Date() >= PROOF_DATE) {
    try {
      const { publicId } = await getProofOfKeys()
      // only show the update if the proof generated successfully
      if (publicId) {
        showProofOfKeys = true
        updater.emit('update', showProofOfKeys)
        historyUpdater.removeListener(HISTORY_EVENT, onTradeComplete)
      } else {
        logger.error('Proof of keys ID was unavailable, skipping dialog')
      }
    } catch (e) {
      logger.error(`Failed to show proof of keys on trade complete: ${e}`)
    }
  }
}

async function subscribeProofOfKeys (): Promise<void> {
  try {
    if (await hasShownProofOfKeys()) {
      logger.debug('Skipping proof of keys listener setup')
    } else {
      historyUpdater.on(HISTORY_EVENT, onTradeComplete)
    }
  } catch (e) {
    logger.error(`Failed to initialize proof of keys: ${e}`)
  }
}

subscribeProofOfKeys()
