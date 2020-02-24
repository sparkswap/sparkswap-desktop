import { EventEmitter } from 'events'
import { HistoricalDataResponse } from '../../global-shared/types/server'
import { delay } from '../../global-shared/util'
import { EVENT_NAMES, WEBSOCKETS_URL } from '../../common/config'
import logger from '../../global-shared/logger'
import { getMarketData } from './server'

// Milliseconds between retries if the WebSocket fails
const WS_RETRY_DELAY = 100

// Milliseconds between retries if the initial load fails
const REST_RETRY_DELAY = 2000

export interface PricePoint {
  date: Date,
  price: number
}

export enum DateRange {
  Trailing365D
}

const RANGE_INTERVAL_MS = Object.freeze({
  // one data point per day
  [DateRange.Trailing365D]: 24 * 60 * 60 * 1000
})

function getRange (range: DateRange): [Date, Date] {
  const end = new Date()
  if (range === DateRange.Trailing365D) {
    const start = new Date(new Date(end).setDate(end.getDate() - 365))
    return [start, end]
  }

  throw new Error(`Unsupported date range: ${range}`)
}

function formatHistoricalData (res: HistoricalDataResponse): PricePoint[] {
  return Object.entries(res).map((arr) => {
    const [date, price] = arr
    return {
      date: new Date(date),
      price
    }
  }).sort((a, b) => a.date.getTime() - b.date.getTime())
}

const isValidPrice = (price: number): boolean => !isNaN(price) && price > 0

export class MarketData extends EventEmitter {
  currentPrice: number | null
  historicalData: PricePoint[]

  constructor () {
    super()
    this.currentPrice = null
    this.historicalData = []

    this.retrieveMarketData()
    this.retrySubscribeUpdatesForever()
  }

  historicalDataRange (range: DateRange): PricePoint[] {
    // TODO: support other date ranges
    const [start, end] = getRange(range)
    const interval = RANGE_INTERVAL_MS[range]

    return this.historicalData
      .filter((point: PricePoint) => {
        // remove dates outside of the range
        return point.date >= start && point.date <= end
      })
      .reduce((filtered: PricePoint[], point: PricePoint) => {
        // only include one data point per interval
        const lastDate = filtered.length ? filtered[filtered.length - 1].date : new Date(0)
        if (point.date.getTime() - lastDate.getTime() >= interval) {
          filtered.push(point)
        }
        return filtered
      }, [])
  }

  private async retrieveMarketData (): Promise<void> {
    let error: Error | null
    do {
      try {
        const {
          historicalData: rawHistoricalData,
          currentPrice: rawCurrentPrice
        } = await getMarketData()

        this.historicalData = formatHistoricalData(rawHistoricalData)
        this.currentPrice = rawCurrentPrice !== null && isValidPrice(rawCurrentPrice) ? rawCurrentPrice : null

        this.emit('update', {
          historicalData: this.historicalData,
          currentPrice: this.currentPrice
        })
        return
      } catch (e) {
        logger.debug(`Error retrieving market data, retrying: ${e.message}`)
        error = e
        await delay(REST_RETRY_DELAY)
      }
    } while (error != null)
  }

  private async retrySubscribeUpdatesForever (): Promise<never> {
    while (true) {
      try {
        await this.subscribeUpdates()
      } catch (e) {
        logger.debug(`Error during websocket stream, restarting: ${e.message}`)
        await delay(WS_RETRY_DELAY)
      }
    }
  }

  private subscribeUpdates (): Promise<void> {
    return new Promise((resolve, reject) => {
      void resolve
      try {
        const ws = new WebSocket(`${WEBSOCKETS_URL}${EVENT_NAMES.MARKET_PRICE}`)
        ws.onmessage = (event: MessageEvent) => {
          try {
            const rawCurrentPrice = Number(event.data)
            this.currentPrice = isValidPrice(rawCurrentPrice) ? rawCurrentPrice : null

            if (this.currentPrice) {
              this.historicalData.push({ date: new Date(), price: this.currentPrice })
            }
            this.emit('update', {
              currentPrice: this.currentPrice,
              historicalData: this.historicalData
            })
          } catch (e) {
            logger.debug(`Failed to update price, faulty data: ${event.data}`)
          }
        }

        ws.onerror = (event: Event) => {
          ws.close()
          reject(new Error(event.toString()))
        }

        ws.onclose = () => {
          reject(new Error('Websocket closed early'))
        }
      } catch (e) {
        reject(e)
      }
    })
  }
}

export const marketDataSubscriber = new MarketData()
