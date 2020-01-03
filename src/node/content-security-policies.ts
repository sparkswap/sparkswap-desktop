import { session } from 'electron'
import { ANCHOR_PARTITION } from '../common/constants'
import { IS_PRODUCTION } from '../common/config'

// the sha256 hash is for an inline script loaded by react's error overlay
const SCRIPT_SRC_EXT = IS_PRODUCTION
  ? 'https://stack.sparkswap.com wss://stack.sparkswap.com'
  : `'sha256-4qHwYstA/HMoqYktYjfAnyNPmBqLeAqunX99JaEvimc='`
const IMG_SRC_EXT = IS_PRODUCTION ? 'data:' : `localhost:* data:`
const CONNECT_SRC_EXT = IS_PRODUCTION ? '' : `localhost:* ws://localhost:*`

// all of these policy rules are for Help Scout Beacon except Zapier, ipapi, and
// style-src: 'unsafe-inline'; script-src: 'self' (and the *_EXT rules above)
// https://docs.helpscout.com/article/815-csp-settings-for-beacon
// Beacon removed rules (these aren't necessary for the contact form):
// connect-src: wss://*.pusher.com *.sumologic.com sentry.io
const APP_CONTENT_SECURITY_POLICY = `
  connect-src https://ipapi.co https://hooks.zapier.com https://beaconapi.helpscout.net https://chatapi.helpscout.net https://d3hb14vkzrxvla.cloudfront.net ${CONNECT_SRC_EXT};
  style-src 'unsafe-inline' https://fonts.googleapis.com https://beacon-v2.helpscout.net https://djtflbt20bdde.cloudfront.net;
  font-src https://fonts.gstatic.com;
  base-uri https://docs.helpscout.com;
  frame-src https://beacon-v2.helpscout.net https://verify.berbix.com;
  object-src https://beacon-v2.helpscout.net;
  img-src https://d33v4339jhl8k0.cloudfront.net ${IMG_SRC_EXT};
  media-src https://beacon-v2.helpscout.net;
  script-src 'self' https://beacon-v2.helpscout.net https://d12wqas9hcki3z.cloudfront.net https://d33v4339jhl8k0.cloudfront.net ${SCRIPT_SRC_EXT}`

const ANCHOR_PROD_WHITELIST = 'production.plaid.com:*'
const ANCHOR_DEV_WHITELIST = 'sandbox.plaid.com:* development.plaid.com:*'
const ANCHOR_CSP_BASE = `default-src 'self' 'unsafe-inline' cdn.plaid.com:* ajax.googleapis.com:* cdnjs.cloudflare.com:* netdna.bootstrapcdn.com:* use.fontawesome.com:* fonts.googleapis.com:* fonts.gstatic.com:* `

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
