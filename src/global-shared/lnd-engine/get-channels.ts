import { promisify } from 'util'
import {
  Channel,
  ChannelStatus
} from '../types'
import {
  LndActionOptions,
  LndChannel,
  LndPendingChannel,
  PendingChannelWrapper
} from '../types/lnd-engine/client'
import { SECONDS_PER_BLOCK } from './config'
import { deadline } from './deadline'
import {
  serialize as serializeAddress,
  getChanReserves
} from './utils'

function openChanToChannel (lndChan: LndChannel): Channel {
  const {
    localReserve,
    remoteReserve
  } = getChanReserves(lndChan)

  return {
    id: lndChan.channelPoint,
    remoteAddress: serializeAddress(lndChan.remotePubkey),
    status: lndChan.active ? ChannelStatus.ACTIVE : ChannelStatus.INACTIVE,
    localBalance: parseInt(lndChan.localBalance, 10),
    localReserve,
    remoteBalance: parseInt(lndChan.remoteBalance, 10),
    remoteReserve,
    forceCloseDelay: lndChan.csvDelay * SECONDS_PER_BLOCK
  }
}

function pendingChanToChannel (pendingChan: LndPendingChannel, status: ChannelStatus): Channel {
  const {
    localReserve,
    remoteReserve
  } = getChanReserves(pendingChan)

  return {
    id: pendingChan.channelPoint,
    remoteAddress: serializeAddress(pendingChan.remoteNodePub),
    status,
    localBalance: parseInt(pendingChan.localBalance, 10),
    localReserve,
    remoteBalance: parseInt(pendingChan.remoteBalance, 10),
    remoteReserve
  }
}

function pendingChanDesc (a: PendingChannelWrapper, b: PendingChannelWrapper): number {
  return b.channel.channelPoint.localeCompare(a.channel.channelPoint)
}

function openChanDesc (a: LndChannel, b: LndChannel): number {
  return parseInt(b.chanId, 10) - parseInt(a.chanId, 10)
}

export async function getChannels ({ client }: LndActionOptions): Promise<Channel[]> {
  const listChannels = promisify(client.listChannels).bind(client)
  const pendingChannels = promisify(client.pendingChannels).bind(client)

  const [
    { channels = [] },
    {
      pendingOpenChannels = [],
      pendingClosingChannels = [],
      pendingForceClosingChannels = [],
      waitingCloseChannels = []
    }
  ] = await Promise.all([
    listChannels({}, { deadline: deadline() }),
    pendingChannels({}, { deadline: deadline() })
  ])

  // Note that the order of these channels is important to get an overall
  // feeling of newest to oldest (although it is imprecise)
  return [
    ...pendingOpenChannels.sort(pendingChanDesc).map(chan => {
      return pendingChanToChannel(chan.channel, ChannelStatus.PENDING_OPEN)
    }),
    ...channels.sort(openChanDesc).map(openChanToChannel),
    ...waitingCloseChannels.sort(pendingChanDesc).map(chan => {
      return pendingChanToChannel(chan.channel, ChannelStatus.WAITING_CLOSE)
    }),
    ...pendingClosingChannels.sort(pendingChanDesc).map(chan => {
      return pendingChanToChannel(chan.channel, ChannelStatus.PENDING_COOP_CLOSE)
    }),
    ...pendingForceClosingChannels.sort(pendingChanDesc).map(chan => {
      return pendingChanToChannel(chan.channel, ChannelStatus.PENDING_FORCE_CLOSE)
    })
  ]
}
