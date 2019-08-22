const ipcMain = require('electron').ipcMain
const logger = require('../common/utils').logger

function listen (name, handler) {
  ipcMain.on(name, async (event, { id, payload }) => {
    try {
      const response = await handler(payload)
      event.reply(`${name}:${id}`, { response })
    } catch (error) {
      logger.error(`Encountered error when running ${name}`, error)
      event.reply(`${name}:${id}`, { error: error.message })
    }
  })
}

function listenSync (name, handler) {
  ipcMain.on(name, (event, { payload }) => {
    try {
      const response = handler(payload)
      event.returnValue = { response }
    } catch (e) {
      logger.error(`Encountered error when running ${name}`, e)
      event.returnValue = { error: e.message }
    }
  })
}

function close () {
  ipcMain.removeAllListeners()
}

module.exports = {
  listen,
  listenSync,
  close
}
