import fetch, { Headers, RequestInit } from 'node-fetch'
import logger from './logger'

class FetchJsonError extends Error {
  statusCode?: number

  constructor (message?: string, statusCode?: number) {
    super(message)
    this.statusCode = statusCode
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
  const error = json.error || ''
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
    throw new FetchJsonError(message, res.status)
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

  httpOptions.headers.set('Accepts', 'application/json')

  const { ok, status, json } = await getJSON(url, httpOptions)

  if (!ok && !(options.ignoreCodes && options.ignoreCodes.includes(status))) {
    const message = isUnknownJSON(json) ? getErrorMessage(json) : ''
    throw new Error(`Error while requesting "${httpOptions.method} ${url}": ${message}`)
  }

  if (isUnknownJSON(json)) {
    return json
  }

  logger.debug(`Invalid json: ${json}`)
  throw new Error(`Invalid JSON response while requesting ${url}`)
}
