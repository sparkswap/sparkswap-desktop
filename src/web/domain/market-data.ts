import { EventEmitter } from 'events'
import { HistoricalDataResponse } from '../../global-shared/types/server'
import { delay } from '../../global-shared/util'
import { EVENT_NAMES, WEBSOCKETS_URL } from '../../common/config'
import { logger } from '../../common/utils'
import { getMarketData } from './server'

// Milliseconds between retries if the WebSocket fails
const WS_RETRY_DELAY = 100

// Milliseconds between retries if the initial load fails
const REST_RETRY_DELAY = 2000

export interface PricePoint {
  date: Date,
  price: number
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
  currentPrice: number
  historicalData: PricePoint[]
  hasLoadedCurrentPrice: boolean

  constructor () {
    super()
    this.currentPrice = 0
    this.historicalData = []
    this.hasLoadedCurrentPrice = false

    this.on('update', () => {
      if (!this.hasLoadedCurrentPrice && isValidPrice(this.currentPrice)) {
        this.hasLoadedCurrentPrice = true
      }
    })

    this.retrieveMarketData()
    this.retrySubscribeUpdatesForever()
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
        this.currentPrice = rawCurrentPrice || 0

        this.emit('update', {
          historicalData: this.historicalData,
          currentPrice: this.currentPrice
        })
        return
      } catch (e) {
        logger.debug('failed to retrieve market data, retrying', e.message)
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
        logger.debug('error during websocket stream, restarting', e.message)
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
            this.currentPrice = Number(event.data)

            this.emit('update', { currentPrice: this.currentPrice })
          } catch (e) {
            logger.debug('failed to update price, faulty data', event.data)
          }
        }

        ws.onerror = async (event: Event) => {
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
