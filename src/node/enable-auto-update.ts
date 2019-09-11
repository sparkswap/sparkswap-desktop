import { dialog, App, Notification } from 'electron'
import { autoUpdater, AppUpdater, UpdateInfo } from 'electron-updater'
import { delay } from '../global-shared/util'
import { IS_WINDOWS, IS_LINUX } from './util'
import { IS_DEVELOPMENT } from '../common/config'

interface DialogMessageBoxResponse {
  response: number
}

// Check for updates every 20 minutes
const CHECK_FOR_UPDATES_MS = 20 * 60 * 1000

// We set autoDownload to false to prevent MacOS from automatically downloading
// and installing an update without user input. We now handle the updating manually
// through the code below so the user can choose to update, or not.
autoUpdater.autoDownload = false

// This option only affects windows/linux however we want this set so all platforms
// have consistent functionality when installing/auto-updating
autoUpdater.autoInstallOnAppQuit = false

function createNotificationForPlatform (autoUpdater: AppUpdater): Notification {
  const notification = new Notification({
    title: 'Update available for Sparkswap Desktop',
    body: 'Click to install the latest version of Sparkswap Desktop.'
  })

  notification.on('click', async () => {
    const answer: unknown = await dialog.showMessageBox({
      title: 'Update available for Sparkswap Desktop',
      message: 'Do you want to download and install the latest version of Sparkswap Desktop?',
      type: 'question',
      defaultId: 0,
      cancelId: 1,
      buttons: [
        'Update Now',
        'Maybe Later'
      ]
    })

    if (typeof answer !== 'object') {
      return
    }

    const { response } = answer as DialogMessageBoxResponse

    if (response !== 0) {
      return
    }

    autoUpdater.downloadUpdate()

    // We call this manually to trigger UI components because download-progress
    // will not get triggered for differential updates, which only occur on
    // windows/linux
    if (IS_WINDOWS || IS_LINUX) {
      autoUpdater.emit('download-progress')
    }
  })

  return notification
}

function enableAutoUpdate (app: App): void {
  // We need to set the App User Model Id to the app id or notifications for
  // windows will not work correctly.
  // TODO: Consolidate this appId once windows supports configuration files other
  // than yaml for electron-builder
  if (IS_WINDOWS) {
    app.setAppUserModelId('com.sparkswap.Sparkswap')
  }

  let updateNotification: Notification

  // TODO make this configurable through settings
  let shouldCheckForUpdates = true

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`Installing update for current version: ${autoUpdater.currentVersion}. Newest Version: ${info.version}`)
    shouldCheckForUpdates = true
  })

  autoUpdater.on('update-available', () => {
    updateNotification.show()
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('Error in auto-updater for sparkswap.', err)
  })

  app.on('ready', async function () {
    // Testing for autoUpdater should only be done with a built, signed app and its
    // development implementation has bugs that prevent us from testing the code
    // in development.
    if (IS_DEVELOPMENT) {
      console.debug('Skipping autoUpdater in development')
      return
    }

    // We setup the Notification here because we cannot create a notification
    // before the app is ready AND we only want to have one instance of a notification
    // so that multiple notifications will be handled w/ the same element instead
    // of creating a ton of individual notifications for the same thing.
    updateNotification = createNotificationForPlatform(autoUpdater)
    updateNotification.on('click', () => { shouldCheckForUpdates = false })

    // Disabled eslint because we modify this variable outside of the scope of this
    // app handler
    // eslint-disable-next-line
    while (shouldCheckForUpdates) {
      autoUpdater.checkForUpdates()
      await delay(CHECK_FOR_UPDATES_MS)
    }
  })
}

export default enableAutoUpdate
