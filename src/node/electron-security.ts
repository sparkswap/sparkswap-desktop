import * as url from 'url'
import * as path from 'path'
import logger from '../global-shared/logger'
import { App } from 'electron'
import { injectContentSecurityPolicies } from './content-security-policies'
import { IS_PRODUCTION } from '../common/config'

const WEBVIEW_PRELOAD = `file://${path.join(__dirname, 'webview-preload.js')}`

const WEBVIEW_URL_WHITELIST = IS_PRODUCTION
  ? ['https://portal.anchorusd.com']
  : ['https://sandbox-portal.anchorusd.com']

const NAVIGATION_WHITELIST =
  ['https://support.sparkswap.com'].concat(
    IS_PRODUCTION ? [] : ['localhost:5000'])

function secureApp (app: App): void {
  app.on('ready', () => {
    injectContentSecurityPolicies()
  })

  app.on('web-contents-created', (_event, contents) => {
    // disable navigation
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new url.URL(navigationUrl)
      if (!NAVIGATION_WHITELIST.includes(parsedUrl.host)) {
        logger.warn(`tried to navigate app to url: ${navigationUrl}`)
        event.preventDefault()
      }
    })
    // disable new windows
    contents.on('new-window', (event, navigationUrl) => {
      logger.warn(`tried to create a new window: ${navigationUrl}`)
      event.preventDefault()
    })
    // disable webviews
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      const url = new URL(params.src)
      if (!WEBVIEW_URL_WHITELIST.includes(url.origin)) {
        logger.warn(`tried to attach webview with url: ${url.href}`)
        event.preventDefault()
      }

      // Best practices for webviews (see: https://electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation)

      // Strip away preload scripts if not our explicit preload script
      if (webPreferences.preload !== WEBVIEW_PRELOAD) {
        delete webPreferences.preload
      }
      if (webPreferences.preloadURL !== WEBVIEW_PRELOAD) {
        delete webPreferences.preloadURL
      }

      // Disable Node.js integration
      webPreferences.nodeIntegration = false

      // Disable subframe usage
      webPreferences.nodeIntegrationInSubFrames = false

      // Disable remote module
      webPreferences.enableRemoteModule = false
    })
  })
}

export default secureApp
