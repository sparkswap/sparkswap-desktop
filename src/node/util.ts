import { URL } from 'url'
import logger from '../global-shared/logger'
import { getAuth } from './auth'
import { serverRequest as baseRequest } from '../common/utils'
import { UnknownJSON } from '../global-shared/fetch-json'
import { shell } from 'electron'
import { IS_TEST, IS_PRODUCTION } from '../common/config'

export function serverRequest (path: string, data: object = {}): Promise<UnknownJSON> {
  return baseRequest(path, data, getAuth)
}

// TODO: make a whitelist of links and use that instead of just enforcing https/mailto
const PROTOCOL_WHITELIST = ['https:', 'mailto:']

if (!IS_PRODUCTION) {
  PROTOCOL_WHITELIST.push('http:')
}

export function openLink (link: string): void {
  const url = new URL(link)

  if (IS_TEST) {
    logger.warn(`Pretending to open window in Test: ${link}`)
    return
  }

  if (PROTOCOL_WHITELIST.includes(url.protocol)) {
    shell.openExternal(link)
  } else {
    logger.warn(`tried to open insecure link: ${link}`)
  }
}

export const IS_MACOS = process.platform === 'darwin'
export const IS_WINDOWS = process.platform === 'win32'
export const IS_LINUX = process.platform === 'linux'
