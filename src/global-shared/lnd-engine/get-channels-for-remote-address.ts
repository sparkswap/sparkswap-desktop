import { LndActionOptions } from '../types/lnd-engine/client'
import { getChannels } from './get-channels'
import {
  Channel,
  ChannelStatus,
  PaymentChannelNetworkAddress
} from '../types'
import {
  parse as parseAddress
} from './utils'

const VALID_STATUSES = [
  ChannelStatus.ACTIVE,
  ChannelStatus.INACTIVE,
  ChannelStatus.PENDING_OPEN
]

// Get open and pending open channels for a given address
export async function getChannelsForRemoteAddress (
  address: PaymentChannelNetworkAddress, { client, logger }: LndActionOptions): Promise<Channel[]> {
  const { publicKey } = parseAddress(address)

  const channels = await getChannels({ client, logger })

  if (channels.length === 0) {
    logger.debug('getChannelsForRemoteAddress: No channels exist')
  }

  return channels
    .filter((chan: Channel) => VALID_STATUSES.includes(chan.status))
    .filter((chan: Channel) => parseAddress(chan.remoteAddress).publicKey === publicKey)
}
