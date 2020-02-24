import {
  LndChannel,
  LndPendingChannel
} from '../../types/lnd-engine/client'

interface ChannelReserves {
  localReserve: number,
  remoteReserve: number
}

// This is hard-coded in LND. We can remove this value
// once we update all clients to LND > 0.8, which
// will add remote/local reserves to the channels API.
const LIGHTNING_CHANNEL_RESERVE = 0.01

function calculateChannelReserve (capacity: number, balance: number): number {
  const reserve = Math.round(capacity * LIGHTNING_CHANNEL_RESERVE)
  return Math.min(reserve, balance)
}

// We can remove this function once we update all clients to LND > 0.8, which
// will add remote/local reserves to the channels API.
export function getChanReserves (chan: LndChannel | LndPendingChannel): ChannelReserves {
  const capacity = parseInt(chan.capacity, 10)
  const localBalance = parseInt(chan.localBalance, 10)
  const remoteBalance = parseInt(chan.remoteBalance, 10)

  return {
    localReserve: calculateChannelReserve(capacity, localBalance),
    remoteReserve: calculateChannelReserve(capacity, remoteBalance)
  }
}
