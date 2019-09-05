import { getServerAddress } from './server'
import { Asset } from '../global-shared/types'
import LndEngine, { Channel } from 'lnd-engine'

interface ChannelsState {
  maxRemotePendingOpenBalance: number,
  maxRemoteActiveBalance: number
}

function findMaxRemoteBalance (channels: Channel[]): number {
  return Math.max(...channels.map(channel => parseFloat(channel.remoteBalance)))
}

async function getChannelsWithServer (engine: LndEngine): Promise<Channel[]> {
  const serverAddress = (await getServerAddress(Asset.BTC)).address
  const channels = await engine.getChannelsForRemoteAddress(serverAddress)

  return channels as unknown as Channel[]
}

export async function getChannelsState (engine: LndEngine): Promise<ChannelsState> {
  const channels = await getChannelsWithServer(engine)
  const activeChannels = channels.filter(chan => chan.active)
  const pendingChannels = channels.filter(chan => chan.active === undefined)

  return {
    maxRemotePendingOpenBalance: findMaxRemoteBalance(pendingChannels),
    maxRemoteActiveBalance: findMaxRemoteBalance(activeChannels)
  }
}
