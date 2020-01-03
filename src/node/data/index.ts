import { initialize, close } from './db'
import {
  addTrade,
  getTrades,
  getTrade,
  getPendingTrades,
  completeTrade,
  failTrade,
  updater as tradeUpdater
} from './trades'
import {
  markProofOfKeysShown,
  hasShownProofOfKeys
} from './events'

export {
  initialize,
  close,
  addTrade,
  getTrades,
  getTrade,
  getPendingTrades,
  completeTrade,
  failTrade,
  tradeUpdater,
  markProofOfKeysShown,
  hasShownProofOfKeys
}
