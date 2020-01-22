import { getTrades, getTrade } from './main-request'
import { Trade, TradeStatus } from '../../common/types'
import { EventEmitter } from 'events'
import { ipcRenderer } from '../electron'
import { formatDate, formatAmount } from '../ui/formatters'
import mainRequest from './main-request'

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

export async function exportTrades (exportLimit: number, historyExportPath: string): Promise<void> {
  const tradesArr = await getTrades(exportLimit, undefined)
  var content = ''
  tradesArr.forEach(trade => 
    {
      if (trade.status === TradeStatus.COMPLETE) {
        content = content 
        + trade.id + ','
        + formatDate(trade.endTime || trade.startTime) + ','
        + formatAmount(trade.sourceAmount) + ','
        + formatAmount(trade.destinationAmount) + ''
        +'\n'
      }
    }
  )
  
  try {
    await mainRequest('file:writeFileSync', {
      filePath: historyExportPath,
      content: content
    })
  }
  catch(e) {
     alert(e);
  }
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
