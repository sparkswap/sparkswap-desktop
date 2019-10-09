import path from 'path'
import { openLogFile, closeLogFile } from '../global-shared/logger'
const app = require('electron').app
const secureApp = require('./electron-security').default
const manageWindows = require('./windows').default
const startRouter = require('./router').default
const enableAutoUpdate = require('./enable-auto-update').default
const createMenu = require('./create-menu').default

app.on('will-quit', closeLogFile)

const logPath = path.join(app.getPath('userData'), 'sparkswap.log')

openLogFile(logPath).then(() => {
  enableAutoUpdate(app)
  secureApp(app)
  // router needs to be started before manage windows so that
  // our router is always ready once windows are created
  startRouter(app)
  createMenu(app)
  manageWindows(app)
})
