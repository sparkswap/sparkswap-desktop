import * as url from 'url'
import * as path from 'path'
import { BrowserWindow, App, Event } from 'electron'

function createMainWindow (): BrowserWindow {
  const window = new BrowserWindow({
    titleBarStyle: 'hiddenInset',
    width: 1100,
    height: 650,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      devTools: process.env.NODE_ENV === 'development'
    },
    icon: path.join(__dirname, '..', '..', 'index.html'),
    backgroundColor: '#293742',
    show: false
  })

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '..', '..', 'index.html'),
    protocol: 'file:',
    slashes: true
  })

  // and load the index.html of the app.
  window.loadURL(startUrl)

  window.on('ready-to-show', function () {
    window.show()
  })

  return window
}

function manageWindows (app: App): void {
  const windows: Set<BrowserWindow> = new Set()
  let appIsQuitting = false

  function addWindow (): void {
    // if our app is still active, but doesn't have any
    // windows we should add a new one. (This is standard
    // OSX behavior).
    if (windows.size === 0) {
      const mainWindow = createMainWindow()
      windows.add(mainWindow)

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

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

export default manageWindows
