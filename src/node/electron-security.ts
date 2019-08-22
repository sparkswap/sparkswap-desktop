import * as url from 'url'
import { App, session } from 'electron'
import { ANCHOR_PARTITION } from '../common/constants'

const URL_WHITELIST = ['https://sandbox-portal.anchorusd.com', 'https://portal.anchorusd.com']

const ANCHOR_WEBVIEW_CONTENT_WHITELIST = 'cdn.rawgit.com:* cdn.plaid.com:* ' +
  'sandbox.plaid.com:* ' +
  'ajax.googleapis.com:* ' +
  'cdnjs.cloudflare.com:* ' +
  'unpkg.com:* ' +
  'netdna.bootstrapcdn.com:* ' +
  'use.fontawesome.com:* ' +
  'fonts.googleapis.com:*'

// TODO: add production URLs
const APP_CONTENT_SECURITY_POLICY = `default-src 'self' 'unsafe-inline' localhost:* ws://localhost:*`
const ANCHOR_WEBVIEW_CONTENT_SECURITY_POLICY = `${APP_CONTENT_SECURITY_POLICY} ${ANCHOR_WEBVIEW_CONTENT_WHITELIST}`

function injectContentSecurityPolicies (): void {
  if (!session.defaultSession) throw new Error('Default session is not defined')
  // Block all remote CSS and JavaScript
  session.defaultSession.webRequest.onHeadersReceived((details, next) => {
    next({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [APP_CONTENT_SECURITY_POLICY]
      }
    })
  })

  session.fromPartition(ANCHOR_PARTITION).webRequest.onHeadersReceived((details, next) => {
    next({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [ANCHOR_WEBVIEW_CONTENT_SECURITY_POLICY]
      }
    })
  })
}

function secureApp (app: App): void {
  app.on('ready', () => {
    injectContentSecurityPolicies()
  })

  app.on('web-contents-created', (_event, contents) => {
    // disable navigation
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new url.URL(navigationUrl)
      if (parsedUrl.host !== `localhost:${process.env.PORT}`) {
        console.warn(`tried to navigate app to url: ${navigationUrl}`)
        event.preventDefault()
      }
    })
    // disable new windows
    contents.on('new-window', async (event, navigationUrl) => {
      console.warn(`tried to create a new window: ${navigationUrl}`)
      event.preventDefault()
    })
    // disable webviews
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      const url = new URL(params.src)
      if (!URL_WHITELIST.includes(url.origin)) {
        console.warn(`tried to attach webview with url: ${url.href}`)
        event.preventDefault()
      }

      // Best practices for webviews (see: https://electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation)

      // Strip away preload scripts if unused or verify their location is legitimate
      delete webPreferences.preload
      delete webPreferences.preloadURL

      // Disable Node.js integration
      webPreferences.nodeIntegration = false
    })
  })
}

export default secureApp
