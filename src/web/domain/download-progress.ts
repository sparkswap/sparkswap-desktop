import { EventEmitter } from 'events'
import { ipcRenderer } from '../electron'

export const EVENTS = Object.freeze({
  DOWNLOAD_STARTED: 'downloadStarted',
  DOWNLOAD_RESTART: 'downloadRestart',
  DOWNLOAD_PROGRESS: 'downloadProgress'
})

export const updater = new EventEmitter()

function subscribeToDownloadEvents (): void {
  ipcRenderer.on(EVENTS.DOWNLOAD_STARTED, () => updater.emit(EVENTS.DOWNLOAD_STARTED))
  ipcRenderer.on(EVENTS.DOWNLOAD_RESTART, () => updater.emit(EVENTS.DOWNLOAD_RESTART))
  ipcRenderer.on(EVENTS.DOWNLOAD_PROGRESS, (_, ...args) => {
    const percent = args[0] as number
    updater.emit(EVENTS.DOWNLOAD_PROGRESS, percent)
  })
}

subscribeToDownloadEvents()
