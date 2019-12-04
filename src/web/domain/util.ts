import * as lnd from './lnd'
import { getAuth } from './main-request'
import { serverRequest as baseRequest } from '../../common/utils'
import { Asset } from '../../global-shared/types'
import { UnknownJSON } from '../../global-shared/fetch-json'

export function serverRequest (path: string, data: object = {}): Promise<UnknownJSON> {
  return baseRequest(path, data, getAuth)
}

export function getPaymentChannelNetworkAddress (asset: Asset): Promise<string> {
  if (asset === Asset.BTC) {
    return lnd.getPaymentChannelNetworkAddress()
  }

  throw new Error('Anchor addresses are not implemented')
}
