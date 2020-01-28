import * as url from 'url'
import * as path from 'path'
import { autoUpdater, BrowserWindow, App, Event } from 'electron'
import { autoUpdater as electronUpdater } from 'electron-updater'
import { IS_MACOS, IS_LINUX } from './util'
import { IS_DEVELOPMENT, IS_PRODUCTION, IS_TEST } from '../common/config'
import { tradeUpdater, recurringBuyUpdater } from './data'
import { delay } from '../global-shared/util'
import { ProgressInfo } from 'app-builder-lib'
import logger from '../global-shared/logger'
import { Nullable } from '../global-shared/types'

const DOWNLOAD_RESTART_DELAY_MS = 5000
const LN_URI_PREFIX = 'lightning:'
const WIDTH = 1100
const HEIGHT = 650
const MIN_WIDTH = 905
// Add 30px for Linux and Windows
const MIN_HEIGHT = IS_MACOS ? 595 : 625

function isWindowAvailable (window: BrowserWindow): boolean {
  return !window.isDestroyed() && !window.webContents.isDestroyed()
}

function createMainWindow (): BrowserWindow {
  const window = new BrowserWindow({
    titleBarStyle: 'hiddenInset',
    width: WIDTH,
    height: HEIGHT,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      devTools: IS_DEVELOPMENT || IS_TEST
    },
    icon: IS_DEVELOPMENT
      ? path.join(__dirname, '..', '..', 'public', 'icon.png')
      : path.join(__dirname, '..', '..', 'icon.png'),
    backgroundColor: '#293742',
    show: false
  })

  window.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)

  const startUrl = IS_PRODUCTION || IS_TEST
    ? url.format({
      pathname: IS_TEST
        ? path.join(__dirname, '..', '..', 'build', 'index.html')
        : path.join(__dirname, '..', '..', 'index.html'),
      protocol: 'file:',
      slashes: true
    })
    : 'http://localhost:5000'

  // and load the index.html of the app.
  window.loadURL(startUrl)

  window.on('ready-to-show', function () {
    window.show()
  })

  tradeUpdater.on('change', (id: number) => {
    if (isWindowAvailable(window)) {
      window.webContents.send('tradeUpdate', id)
    }
  })

  recurringBuyUpdater.on('change', (id: number) => {
    if (isWindowAvailable(window)) {
      window.webContents.send('recurringBuyUpdate', id)
    }
  })

  electronUpdater.on('download-progress', (progress: ProgressInfo) => {
    if (!isWindowAvailable(window)) {
      return
    }

    window.webContents.send('downloadStarted')

    if (IS_MACOS) {
      window.webContents.send('downloadProgress', progress.percent)
    }
  })

  electronUpdater.on('update-downloaded', async () => {
    if (isWindowAvailable(window)) {
      window.webContents.send('downloadRestart')
      await delay(DOWNLOAD_RESTART_DELAY_MS)
    }

    electronUpdater.quitAndInstall()
  })

  return window
}

function manageWindows (app: App): void {
  const windows: Set<BrowserWindow> = new Set()
  let appIsQuitting = false
  let protocolUrl: Nullable<string> = null

  // handle url events by either sending to the app,
  // or holding them in memory until the app is ready
  function handleOpenUrl (urlToOpen: string): void {
    logger.debug(`handling open url: ${urlToOpen}`)
    if (windows.size !== 0) {
      handleLightningLink(urlToOpen)
    } else {
      protocolUrl = urlToOpen
    }
  }

  // Handles URIs for https://github.com/lightningnetwork/lightning-rfc/blob/master/11-payment-encoding.md#encoding-overview
  function handleLightningLink (input: string): void {
    // only handle lightning strings
    if (input.slice(0, LN_URI_PREFIX.length) === LN_URI_PREFIX) {
      const paymentRequest = input.slice(LN_URI_PREFIX.length)
      // show our main window, which should be the first
      // in the Set
      const mainWindow = windows.values().next().value
      mainWindow.webContents.send('lightningPaymentUri', { paymentRequest })
      mainWindow.show()
    }
  }

  function addWindow (): void {
    // if our app is still active, but doesn't have any
    // windows we should add a new one. (This is standard
    // OSX behavior).
    if (windows.size === 0) {
      const mainWindow = createMainWindow()
      windows.add(mainWindow)

      mainWindow.webContents.on('did-finish-load', () => {
        // Check to see if we have a protocol link to handle from app startup time.
        // On the mac, `protocolUrl` will be set as a result of us trying to process the link from the `open-url` handler.
        // On windows/linux the link will be passed to electron as the first process argument.
        const urlToOpen = process.platform === 'darwin' ? protocolUrl : protocolUrl || process.argv.slice(1)[0]
        if (urlToOpen) {
          handleLightningLink(urlToOpen)
          protocolUrl = null
        }
      })

      mainWindow.on('close', function (event: Event) {
        // on OSX we want to just hide the window unless
        // the app is quitting
        if (!appIsQuitting && process.platform === 'darwin') {
          // need to not do this if the app is exiting
          event.preventDefault()
          mainWindow.hide()
        }
      })

      mainWindow.on('closed', () => {
        windows.delete(mainWindow)
      })
    } else {
      // show our main window, which should be the first
      // in the Set
      const mainWindow = windows.values().next().value
      mainWindow.show()
    }
  }

  app.on('ready', addWindow)
  app.on('activate', addWindow)

  app.on('before-quit', function () {
    appIsQuitting = true
  })

  autoUpdater.on('before-quit-for-update', () => {
    appIsQuitting = true
  })

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin' || (appIsQuitting || IS_TEST)) {
      app.quit()
    }
  })

  app.on('will-finish-launching', function () {
    app.on('open-url', (event, urlToOpen) => {
      event.preventDefault()
      handleOpenUrl(urlToOpen)
    })
  })

  app.setAsDefaultProtocolClient('lightning')

  // Hardware acceleration on electron dev makes linux machines run incredibly
  // slow so we disable it only for development.
  if (IS_LINUX && IS_DEVELOPMENT) {
    app.disableHardwareAcceleration()
  }
}

export default manageWindows
