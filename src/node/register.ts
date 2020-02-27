import { Asset } from '../global-shared/types'
import { RegisterRequest } from '../global-shared/types/server'
import LndEngine from '../global-shared/lnd-engine'
import { register as registerWithServer } from './server'

export async function register (lndEngine: LndEngine): Promise<void> {
  const paymentChannelNetworkAddress = await lndEngine.getPaymentChannelNetworkAddress()

  const registerRequest: RegisterRequest = {
    paymentChannelNetworkAddress,
    asset: Asset.BTC
  }

  return registerWithServer(registerRequest)
}
