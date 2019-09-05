import { getTrades } from './main-request'
import { Trade } from '../../common/types'
import { EventEmitter } from 'events'
import { ipcRenderer } from '../electron'

export let trades: Trade[] = []

export const updater = new EventEmitter()

async function updateTrades (): Promise<void> {
  trades = await getTrades()
  updater.emit('update', trades)
}

async function subscribeTrades (): Promise<void> {
  await updateTrades()
  ipcRenderer.on('tradeUpdate', (_event: Event, _id: number) => updateTrades())
}

subscribeTrades()
