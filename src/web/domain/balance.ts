import { getBalance } from '../domain/main-request'
import { Asset, Amount, valueToAsset } from '../../global-shared/types'
import { delay } from '../../global-shared/util'
import EventEmitter from 'events'
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
  let update = false

  try {
    const balance = await getBalance(asset)
    const existingBalance = balances[asset]
    if (existingBalance instanceof Error || existingBalance.value !== balance.value) {
      update = true
    }
    balances[asset] = balance
  } catch (e) {
    // update if did not used to be in an error state
    const existingBalance = balances[asset]
    if (existingBalance instanceof Error) {
      update = true

      if (existingBalance.message !== e.message) {
        console.error(`Error while retrieving balance: ${e.message}`)
      }
    }
    balances[asset] = e
  }

  if (update) balanceUpdater.emit('update', asset, balances[asset])

  return balances[asset]
}

async function pollBalances (): Promise<void> {
  while (true) {
    Object.keys(balances).forEach(asset => getBalanceState(valueToAsset(asset)))
    await delay(POLL_BALANCE_DELAY)
  }
}

// stay running for the life of the process
pollBalances()
