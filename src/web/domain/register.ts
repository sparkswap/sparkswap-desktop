import { Asset } from '../../global-shared/types'
import { RegisterRequest } from '../../global-shared/types/server'
import * as server from './server'
import { getPaymentChannelNetworkAddress } from './util'

export default async function register (): Promise<void> {
  const paymentChannelNetworkAddress = await getPaymentChannelNetworkAddress(Asset.BTC)
  const registerRequest: RegisterRequest = {
    paymentChannelNetworkAddress,
    asset: Asset.BTC
  }

  return server.register(registerRequest)
}
