import { getAuth } from './auth'
import { serverRequest as baseRequest } from '../common/utils'
import { UnknownJSON } from '../global-shared/fetch-json'

export function serverRequest (path: string, data: object = {}): Promise<UnknownJSON> {
  return baseRequest(path, data, getAuth)
}
