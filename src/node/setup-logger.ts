import path from 'path'
import { app, App } from 'electron'
import logger from '../global-shared/logger'
import { FileTransport } from '../global-shared/logger-file'
import { pipeFromRenderer } from './logger-electron-main'

const LOG_PATH = path.join(app.getPath('userData'), 'sparkswap.log')

export default function setupLogger (app: App): void {
  // The LOG_PATH is only guaranteed to be created once the `ready` event is called
  // for the application. We open the logfile on ready to prevent ENONT errors on
  // first run.
  app.on('ready', () => {
    const fileTransport = new FileTransport(LOG_PATH)
    logger.addTransport(fileTransport)
    pipeFromRenderer(logger)

    logger.info(`Initialized ${app.getName()} ${app.getVersion()}`)

    app.on('will-quit', () => fileTransport.close())
  })
}
