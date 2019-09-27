import fetchJSON, { UnknownJSON, ResponseOptions } from '../fetch-json'
import { btoa } from '../util'
import * as querystring from 'querystring'

export enum RequestMethods {
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
  DELETE = 'DELETE'
}

const ANCHOR_URL = process.env.NODE_ENV !== 'development'
  ? 'https://api.anchorusd.com'
  : 'https://sandbox-api.anchorusd.com'

export interface RequestOptions {
  method?: RequestMethods,
  fetchOptions?: ResponseOptions,
  headers?: { [key: string]: string }
}

export default async function request (apiKey: string, path: string, data: object = {}, options: RequestOptions = {}): Promise<UnknownJSON> {
  const method = options.method || RequestMethods.GET
  const fetchOptions = options.fetchOptions || {}
  const requestHeaders = options.headers || {}
  const headers = Object.assign(requestHeaders, {
    Authorization: 'Basic ' + btoa(apiKey + ':')
  })

  const hasContentType = Object.keys(requestHeaders).some(k => k.toLowerCase() === 'content-type')
  if (!hasContentType) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const url = `${ANCHOR_URL}${path}`
  const httpOptions = {
    method,
    headers
  }

  // If the request includes 'Content-Type' headers, the data object should be
  // passed in without expectation of modification
  const query = hasContentType ? data : querystring.encode(data as querystring.ParsedUrlQueryInput)

  if (Object.keys(data).length === 0) {
    return fetchJSON(url, httpOptions, fetchOptions)
  } else if (method === RequestMethods.GET || method === RequestMethods.HEAD) {
    return fetchJSON(`${url}?${query}`, httpOptions, fetchOptions)
  } else {
    return fetchJSON(url, Object.assign(httpOptions, { body: query }), fetchOptions)
  }
}
