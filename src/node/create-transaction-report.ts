import * as fs from 'fs'
import * as path from 'path'
import { Database } from 'better-sqlite3'
import { app, dialog } from 'electron'
import { getTrades } from './data/trades'
import logger from '../global-shared/logger'
import { TradeStatus, Trade } from '../common/types'
import { toCommonPrice } from '../common/currency-conversions'
import { Asset } from '../global-shared/types'
import { formatAmount } from '../common/formatters'

const TRADE_RECORDS_PER_QUERY = 1000

export async function createTransactionReport (db: Database): Promise<boolean> {
  const options = {
    title: 'Save Transaction History',
    defaultPath: path.join(app.getPath('downloads'), `sparkswap-transactions.csv`)
  }

  const reportFilePath = await dialog.showSaveDialog(options)

  return new Promise((resolve, reject) => {
    if (reportFilePath.canceled) {
      return resolve(false)
    }

    // Since we set a default above, this shouldnt happen, however we should still
    // check to make sure the value exists before continuing (for typescript)
    if (!reportFilePath.filePath) {
      return reject(new Error('No file path specified'))
    }

    // The dialog will prompt a user if they want to overwrite the file so we can use
    // overwrite/truncate settings for the write stream
    const fileStream = fs.createWriteStream(reportFilePath.filePath, { flags: 'w+' })

    fileStream.on('error', (err: Error) => {
      logger.error(`Error occurred when writing report: ${err.message}`)
      return reject(err)
    })

    fileStream.on('finish', () => {
      return resolve(true)
    })

    const columns = [
      'id',
      'date',
      'type',
      'usd_amount',
      'btc_amount',
      'price',
      'status'
    ]

    fileStream.write(`${columns.join(',')}\n`)

    let trades: Trade[] = []
    let oldestTrade: number | undefined

    do {
      trades = getTrades(db, oldestTrade, TRADE_RECORDS_PER_QUERY)
      oldestTrade = trades[trades.length - 1].id

      for (const trade of trades) {
        const bought = trade.destinationAmount.asset === Asset.BTC
        const type = bought ? 'BUY' : 'SELL'
        const usdAmount = bought
          ? trade.sourceAmount
          : trade.destinationAmount
        const btcAmount = bought
          ? trade.destinationAmount
          : trade.sourceAmount
        const priceAmount = toCommonPrice(btcAmount.value, usdAmount.value)

        const row = [
          trade.id,
          trade.endTime
            ? trade.endTime.toISOString()
            : trade.startTime.toISOString(),
          type,
          `"${formatAmount(usdAmount)}"`,
          `"${formatAmount(btcAmount)}"`,
          `"${formatAmount(priceAmount)}"`,
          TradeStatus[trade.status]
        ]
        fileStream.write(`${row.join(',')}\n`)
      }
    } while (trades.length === TRADE_RECORDS_PER_QUERY)

    fileStream.end()
  })
}
