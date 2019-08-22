import { getTrades } from './main-request'
import { delay } from '../../global-shared/util'
import { Trade } from '../../common/types'
import EventEmitter from 'events'

export const updater = new EventEmitter()

function getLatestTime (trade: Trade): Date {
  return trade.endTime || trade.startTime
}

export let trades: Trade[] = []
let lastUpdate = new Date(0)

const ERROR_DELAY = 5000

async function subscribeTrades (): Promise<void> {
  // this single subscriber should run for the life of the process
  while (true) {
    try {
      // this is a long poll, it returns when
      // there is a change.
      trades = (await getTrades(lastUpdate)).sort((a, b) => {
        return getLatestTime(b).getTime() - getLatestTime(a).getTime()
      })

      const lastTrade = trades[0]

      lastUpdate = lastTrade ? getLatestTime(lastTrade) : new Date(0)

      updater.emit('update', trades, lastUpdate)
    } catch (e) {
      console.error(`Error while polling for trades: ${e.message}`)
      await delay(ERROR_DELAY)
    }
  }
}

subscribeTrades()
