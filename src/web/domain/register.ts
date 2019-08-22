import { ReviewStatus, Asset, URL } from '../../global-shared/types'
import * as server from './server'
import { getPaymentChannelNetworkAddress } from './util'
import { startDeposit } from './main-request'

interface RegisterResult {
  reviewStatus: ReviewStatus,
  url?: URL
}

export default async function register (): Promise<RegisterResult> {
  const paymentChannelNetworkAddress = await getPaymentChannelNetworkAddress(Asset.BTC)
  const data = {
    paymentChannelNetworkAddress,
    asset: Asset.BTC
  }

  const { reviewStatus } = await server.register(data)

  const userCanDeposit = (
    reviewStatus === ReviewStatus.APPROVED || reviewStatus === ReviewStatus.PENDING
  )

  if (userCanDeposit) {
    const url = await startDeposit()
    return { reviewStatus, url }
  }

  return { reviewStatus }
}
