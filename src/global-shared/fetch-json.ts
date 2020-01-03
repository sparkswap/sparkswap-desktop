import fetch, { Headers, RequestInit } from 'node-fetch'
import logger from './logger'

interface FetchJsonErrorOpts {
  status?: number,
  code?: string,
  error?: string,
  reason?: string
}

class FetchJsonError extends Error {
  status?: number
  code?: string
  error?: string
  reason?: string

  constructor (message?: string, opts?: FetchJsonErrorOpts) {
    super(message)
    if (opts) {
      this.status = opts.status
      this.code = opts.code
      this.error = opts.error
      this.reason = opts.reason
    }
  }
}

export interface ResponseOptions {
  ignoreCodes?: number[]
}

export interface UnknownJSON {
  [key: string]: unknown,
  error?: string
}

export function isUnknownJSON (obj: unknown): obj is UnknownJSON {
  if (typeof obj !== 'object' || obj == null) {
    return false
  }

  // make sure this is a plain object
  if (obj.constructor !== Object) {
    return false
  }

  return Object.keys(obj).every(key => typeof key === 'string')
}

function getErrorMessage (json: UnknownJSON): string {
  const error = json.error || JSON.stringify(json)
  return json.reason ? `${error} (${json.reason})` : error
}

async function getJSON (url: string, httpOptions: RequestInit):
Promise<{ ok: boolean, status: number, json: unknown }> {
  const res = await fetch(url, httpOptions)

  try {
    const json = await res.json()
    return { ok: res.ok, status: res.status, json }
  } catch (e) {
    const message = `Error while requesting "${httpOptions.method} ${url}": ${res.status} ${res.statusText}`
    throw new FetchJsonError(message, { status: res.status })
  }
}

export default async function fetchJSON (url: string, httpOptions: RequestInit, options: ResponseOptions = {}): Promise<UnknownJSON> {
  if (!httpOptions.headers) {
    httpOptions.headers = new Headers()
  }

  if (!(httpOptions.headers instanceof Headers)) {
    httpOptions.headers = new Headers(httpOptions.headers)
  }

  if (!httpOptions.headers.get('Content-Type')) {
    httpOptions.headers.set('Content-Type', 'application/json')
  }

  if (!httpOptions.headers.get('Accept')) {
    httpOptions.headers.set('Accept', 'application/json')
  }

  const { ok, status, json } = await getJSON(url, httpOptions)

  if (!ok && !(options.ignoreCodes && options.ignoreCodes.includes(status))) {
    const message = isUnknownJSON(json) ? getErrorMessage(json) : ''
    const opts = { status }
    if (isUnknownJSON(json)) {
      Object.assign(opts, {
        code: json.code,
        error: json.error,
        reason: json.reason
      })
    }
    throw new FetchJsonError(`Error while requesting "${httpOptions.method} ${url}": ${message}`, opts)
  }

  if (isUnknownJSON(json)) {
    return json
  }

  logger.debug(`Invalid json: ${json}`)
  throw new Error(`Invalid JSON response while requesting ${url}`)
}
