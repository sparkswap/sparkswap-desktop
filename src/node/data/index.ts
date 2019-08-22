import { initialize, close } from './db'
import {
  addTrade,
  getTrades,
  getTrade,
  getPendingTrades,
  completeTrade,
  failTrade,
  setLastUpdate as setLastTradeUpdate,
  getLastUpdate as getLastTradeUpdate,
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
  setLastTradeUpdate,
  getLastTradeUpdate,
  tradeUpdater
}
