import fetch, { Headers, RequestInit } from 'node-fetch'

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

  const res = await fetch(url, httpOptions)

  try {
    var json = await res.json()
  } catch (e) {
    throw new Error(`Error while requesting "${httpOptions.method} ${url}": ${res.status} ${res.statusText}`)
  }

  if (!res.ok && !(options.ignoreCodes && options.ignoreCodes.includes(res.status))) {
    const message = getErrorMessage(json)
    throw new Error(`Error while requesting "${httpOptions.method} ${url}": ${message}`)
  }

  if (isUnknownJSON(json as unknown)) {
    return json
  }

  console.debug('Invalid json', json)
  throw new Error(`Invalid JSON response while requesting ${url}`)
}
