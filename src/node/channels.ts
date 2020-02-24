import { getServerAddress } from './server'
import {
  Asset,
  Channel,
  ChannelStatus
} from '../global-shared/types'
import LndEngine from '../global-shared/lnd-engine'

interface ChannelsState {
  maxRemotePendingOpenBalance: number,
  maxRemoteActiveBalance: number
}

function findMaxRemoteBalance (channels: Channel[]): number {
  return Math.max(...channels.map(channel => channel.remoteBalance - channel.remoteReserve))
}

async function getChannelsWithServer (engine: LndEngine): Promise<Channel[]> {
  const serverAddress = (await getServerAddress(Asset.BTC)).address
  const channels = await engine.getChannelsForRemoteAddress(serverAddress)

  return channels as unknown as Channel[]
}

export async function getChannelsState (engine: LndEngine): Promise<ChannelsState> {
  const channels = await getChannelsWithServer(engine)
  const activeChannels = channels.filter(chan => chan.status === ChannelStatus.ACTIVE)
  const pendingChannels = channels.filter(chan => chan.status === ChannelStatus.PENDING_OPEN)

  return {
    maxRemotePendingOpenBalance: findMaxRemoteBalance(pendingChannels),
    maxRemoteActiveBalance: findMaxRemoteBalance(activeChannels)
  }
}
