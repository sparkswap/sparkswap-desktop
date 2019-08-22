import fetchJSON, { UnknownJSON, ResponseOptions } from '../fetch-json'
import { btoa } from '../util'
import * as querystring from 'querystring'

export enum RequestMethods {
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
  DELETE = 'DELETE'
}

const ANCHOR_URL = process.env.NODE_ENV === 'development'
  ? 'https://sandbox-api.anchorusd.com'
  : 'https://api.anchorusd.com'

export default async function request (apiKey: string, path: string, data: object = {}, method: RequestMethods = RequestMethods.GET, fetchOptions: ResponseOptions = {}): Promise<UnknownJSON> {
  const headers = {
    Authorization: 'Basic ' + btoa(apiKey + ':'),
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  const url = `${ANCHOR_URL}${path}`
  const httpOptions = {
    method,
    headers
  }

  const query = querystring.encode(data as querystring.ParsedUrlQueryInput)

  if (Object.keys(data).length === 0) {
    return fetchJSON(url, httpOptions, fetchOptions)
  } else if (method === RequestMethods.GET || method === RequestMethods.HEAD) {
    return fetchJSON(`${url}?${query}`, httpOptions, fetchOptions)
  } else {
    return fetchJSON(url, Object.assign(httpOptions, { body: query }), fetchOptions)
  }
}
