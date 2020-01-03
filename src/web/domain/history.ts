import { getTrades, getTrade } from './main-request'
import { Trade, TradeStatus } from '../../common/types'
import { EventEmitter } from 'events'
import { ipcRenderer } from '../electron'

export const trades: Map<number, Trade> = new Map()

export const updater = new EventEmitter()

export let canLoadMore = false

const TRADE_LIMIT = 100

// Returns a boolean indicating whether there additional trades that
// can be loaded.
export async function loadTrades (olderThanTradeId?: number): Promise<boolean> {
  const tradesArr = await getTrades(TRADE_LIMIT, olderThanTradeId)
  tradesArr.forEach(trade => trades.set(trade.id, trade))

  canLoadMore = tradesArr.length === TRADE_LIMIT
  // the emit needs to go after setting `canLoadMore` so consumers
  // can get the updated state when the updated trades go out
  updater.emit('update', trades)
  return canLoadMore
}

async function subscribeTrades (): Promise<void> {
  await loadTrades()
  ipcRenderer.on('tradeUpdate', async (_event: Event, id: number): Promise<void> => {
    const trade = await getTrade(id)
    trades.set(trade.id, trade)
    updater.emit('update', trades)
    const tradeStatusName = TradeStatus[trade.status]
    updater.emit(`trade:${tradeStatusName}`, trade)
  })
}

subscribeTrades()
