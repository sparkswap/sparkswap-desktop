import { session } from 'electron'
import { ANCHOR_PARTITION } from '../common/constants'
import { IS_PRODUCTION } from '../common/config'

const APP_PROD_WHITELIST = 'https://stack.sparkswap.com:* wss://stack.sparkswap.com:*'

// the sha256 hash is for an inline script loaded by react's error overlay
const APP_DEV_WHITELIST = `localhost:* ws://localhost:* 'sha256-4qHwYstA/HMoqYktYjfAnyNPmBqLeAqunX99JaEvimc='`
const APP_CSP_BASE = `style-src 'unsafe-inline'; default-src 'self' https://support.sparkswap.com:* `

const ANCHOR_PROD_WHITELIST = 'production.plaid.com:*'
const ANCHOR_DEV_WHITELIST = 'sandbox.plaid.com:* development.plaid.com:*'
const ANCHOR_CSP_BASE = `default-src 'self' 'unsafe-inline' cdn.plaid.com:* ajax.googleapis.com:* cdnjs.cloudflare.com:* netdna.bootstrapcdn.com:* use.fontawesome.com:* fonts.googleapis.com:* fonts.gstatic.com:* `

const APP_CONTENT_SECURITY_POLICY = APP_CSP_BASE + (IS_PRODUCTION ? APP_PROD_WHITELIST : APP_DEV_WHITELIST)
const ANCHOR_WEBVIEW_CONTENT_SECURITY_POLICY = ANCHOR_CSP_BASE + (IS_PRODUCTION ? ANCHOR_PROD_WHITELIST : ANCHOR_DEV_WHITELIST)

export function injectContentSecurityPolicies (): void {
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
