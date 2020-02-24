import { LndEngineClient } from 'lnd-engine'
import { promisify } from 'util'
import { Asset, Amount } from '../types'
import { LndActionOptions } from '../types/lnd-engine/client'
import { asAmount } from '../currency-conversions'
import { deadline } from './deadline'
import { getChanReserves } from './utils'

export interface Balances {
  total: Amount,
  onChain: Amount,
  lightning: Amount,
  holds: Amount
}

interface LayerBalances {
  total: number,
  available: number,
  holds: number
}

type LightningBalances = LayerBalances
type OnChainBalances = LayerBalances

async function getWalletBalances (client: LndEngineClient): Promise<OnChainBalances> {
  const walletBalance = promisify(client.walletBalance).bind(client)
  const balances = await walletBalance({}, { deadline: deadline() })

  return {
    total: parseInt(balances.totalBalance),
    available: parseInt(balances.confirmedBalance),
    holds: parseInt(balances.unconfirmedBalance)
  }
}

async function getTotalChannelBalances (client: LndEngineClient): Promise<LightningBalances> {
  const listChannels = promisify(client.listChannels).bind(client)
  const pendingChannels = promisify(client.pendingChannels).bind(client)
  const { channels = [] } = await listChannels({}, { deadline: deadline() })
  const { totalLimboBalance } = await pendingChannels({}, { deadline: deadline() })

  let total = 0
  let available = 0
  let holds = 0

  holds += parseInt(totalLimboBalance)

  for (const chan of channels) {
    const localBalance = parseInt(chan.localBalance)
    const { localReserve } = getChanReserves(chan)
    const availableLocalBalance = localBalance - localReserve

    total += localBalance
    holds += parseInt(chan.unsettledBalance)
    holds += localReserve

    // If the channel goes offline then we need to move their totals to the holds
    if (chan.active) {
      available += availableLocalBalance
    } else {
      holds += localBalance
    }
  }

  return {
    total,
    available,
    holds
  }
}

export async function getBalances ({ client }: LndActionOptions): Promise<Balances> {
  const walletBalance = await getWalletBalances(client)
  const totalChannelBalance = await getTotalChannelBalances(client)

  return {
    total: asAmount(Asset.BTC, walletBalance.total + totalChannelBalance.total),
    onChain: asAmount(Asset.BTC, walletBalance.available),
    lightning: asAmount(Asset.BTC, totalChannelBalance.available),
    holds: asAmount(Asset.BTC, walletBalance.holds + totalChannelBalance.holds)
  }
}
