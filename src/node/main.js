import path from 'path'
import { openLogFile, closeLogFile } from '../global-shared/logger'
const app = require('electron').app
const secureApp = require('./electron-security').default
const manageWindows = require('./windows').default
const startRouter = require('./router').default
const enableAutoUpdate = require('./enable-auto-update').default
const createMenu = require('./create-menu').default

const LOG_PATH = path.join(app.getPath('userData'), 'sparkswap.log')

// The LOG_PATH is only guaranteed to be created once the `ready` event is called
// for the application. We open the logfile on ready to prevent ENONT errors on
// first run.
app.on('ready', () => openLogFile(LOG_PATH))
app.on('will-quit', closeLogFile)

enableAutoUpdate(app)
secureApp(app)
// router needs to be started before manage windows so that
// our router is always ready once windows are created
startRouter(app)
createMenu(app)
manageWindows(app)
