import { Auth } from '../../global-shared/types'
import { API_URL } from '../config'
import { btoa } from '../../global-shared/util'
import fetchJSON, { UnknownJSON } from '../../global-shared/fetch-json'

type GetAuthFunction = () => Promise<Auth>

interface AuthHeader {
  Authorization: string,
  [key: string]: string
}

async function getAuthHeader (getAuth: GetAuthFunction): Promise<AuthHeader> {
  const auth = await getAuth()
  return {
    Authorization: 'Basic ' + btoa(auth.uuid + ':' + auth.apiKey)
  }
}

export default async function serverRequest (path: string, data: object = {}, getAuth: GetAuthFunction): Promise<UnknownJSON> {
  const url = `${API_URL}${path}`
  const method = 'POST'
  const headers = await getAuthHeader(getAuth)
  const body = JSON.stringify(data)
  const options = { method, headers, body }

  const json = await fetchJSON(url, options)

  return json
}
