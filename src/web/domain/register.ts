import { Asset } from '../../global-shared/types'
import * as server from './server'
import { getPaymentChannelNetworkAddress } from './util'

export default async function register (): Promise<void> {
  const paymentChannelNetworkAddress = await getPaymentChannelNetworkAddress(Asset.BTC)
  const data = {
    paymentChannelNetworkAddress,
    asset: Asset.BTC
  }

  return server.register(data)
}
