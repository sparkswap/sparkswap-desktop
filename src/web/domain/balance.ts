import logger from '../../global-shared/logger'
import { getBalance } from '../domain/main-request'
import { Asset, Amount, valueToAsset } from '../../global-shared/types'
import { delay } from '../../global-shared/util'
import { EventEmitter } from 'events'
import { toCents } from './quantity'

// Milliseconds between polls for balance
const POLL_BALANCE_DELAY = 10000

export type BalanceState = Amount | Error

interface Balances {
  [Asset.BTC]: BalanceState,
  [Asset.USDX]: BalanceState,
  [asset: string]: BalanceState
}

export const balances: Balances = {
  [Asset.BTC]: new Error('Not retrieved'),
  [Asset.USDX]: new Error('Not retrieved')
}

export const balanceUpdater = new EventEmitter()

export function isUSDXSufficient (usdxQuantity: number): boolean {
  const balance = balances[Asset.USDX]
  if (balance instanceof Error) {
    return false
  }
  return toCents(usdxQuantity) <= balance.value
}

export async function getBalanceState (asset: Asset): Promise<BalanceState> {
  const existingBalance = balances[asset]

  try {
    const balance = await getBalance(asset)
    if (balance === null) {
      throw new Error(`${asset} engine is not validated`)
    }

    balances[asset] = balance

    if (existingBalance instanceof Error || existingBalance.value !== balance.value) {
      balanceUpdater.emit('update', asset, balances[asset])
    }
  } catch (e) {
    balances[asset] = e

    if (!(existingBalance instanceof Error) || existingBalance.message !== e.message) {
      logger.error(`Error while retrieving balance: ${e}`)
      balanceUpdater.emit('update', asset, balances[asset])
    }
  }

  return balances[asset]
}

async function pollBalances (): Promise<never> {
  while (true) {
    Object.keys(balances).forEach(asset => getBalanceState(valueToAsset(asset)))
    await delay(POLL_BALANCE_DELAY)
  }
}

// stay running for the life of the process
pollBalances()
