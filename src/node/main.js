const app = require('electron').app
const secureApp = require('./electron-security').default
const manageWindows = require('./windows').default
const startRouter = require('./router').default
const enableAutoUpdate = require('./enable-auto-update').default

enableAutoUpdate(app)
secureApp(app)
startRouter(app)
manageWindows(app)
