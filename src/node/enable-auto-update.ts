import { App } from 'electron'
import { autoUpdater } from 'electron-updater'

function enableAutoUpdate (app: App): void {
  autoUpdater.on('checking-for-update', () => {
    console.debug('Checking for update...')
  })

  autoUpdater.on('update-available', () => {
    console.debug('Update available.')
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('Error in auto-updater for sparkswap. ' + err)
  })

  app.on('ready', function () {
    autoUpdater.checkForUpdatesAndNotify()
  })
}

export default enableAutoUpdate
