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

export {
  initialize,
  close,
  addTrade,
  getTrades,
  getTrade,
  getPendingTrades,
  completeTrade,
  failTrade,
  tradeUpdater
}
