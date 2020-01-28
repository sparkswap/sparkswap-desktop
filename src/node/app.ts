import { app } from 'electron'
import setupLogger from './setup-logger'
import secureApp from './electron-security'
import manageWindows from './windows'
import startRouter from './router'
import enableAutoUpdate from './enable-auto-update'
import createMenu from './create-menu'

export default function startApp (): void {
  setupLogger(app)
  enableAutoUpdate(app)
  secureApp(app)
  // router needs to be started before manage windows so that
  // our router is always ready once windows are created
  startRouter(app)
  createMenu(app)
  manageWindows(app)
}
