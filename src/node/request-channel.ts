import { Asset, ReviewStatus, ChannelStatus } from '../global-shared/types'
import { parse } from '../global-shared/lnd-engine/utils'
import { getServerAddress, getStatus } from './server'
import LndEngine from '../global-shared/lnd-engine'
import { register } from './register'
import { RequestChannelStatus } from '../common/types'

export async function requestChannel (lndEngine: LndEngine): Promise<RequestChannelStatus> {
  try {
    const { address: serverAddress } = await getServerAddress(Asset.BTC)
    const existingChannels = await lndEngine.getChannels()

    const sparkswapOpenChannels = existingChannels
      .filter(chan => parse(serverAddress).publicKey === parse(chan.remoteAddress).publicKey)
      .filter(chan => chan.status === ChannelStatus.ACTIVE || chan.status === ChannelStatus.PENDING_OPEN)

    if (sparkswapOpenChannels.length !== 0) {
      return RequestChannelStatus.EXISTING_CHANNEL
    }

    // Calling `getStatus` on the server will attempt initializing a channel with the
    // user if they are approved and don't have any existing channels
    const { reviewStatus } = await getStatus()
    if (reviewStatus !== ReviewStatus.APPROVED) {
      return RequestChannelStatus.NOT_APPROVED
    }

    return RequestChannelStatus.SUCCESS
  } catch (e) {
    if (e.status === 401) {
      // The user has not registered, so we register with the server and try again
      await register(lndEngine)
      return requestChannel(lndEngine)
    }

    return RequestChannelStatus.FAILED
  }
}
