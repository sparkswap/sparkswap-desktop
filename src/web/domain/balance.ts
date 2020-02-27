import logger from '../../global-shared/logger'
import { getBalances as requestAssetBalances } from '../domain/main-request'
import {
  Asset,
  EngineBalances,
  AnchorBalances,
  LndBalances
} from '../../global-shared/types'
import { delay, valueToEnum } from '../../global-shared/util'
import { EventEmitter } from 'events'

// Milliseconds between polls for balance
const POLL_BALANCE_DELAY = 10000

export interface AssetBalances {
  [Asset.BTC]: LndBalances | Error,
  [Asset.USDX]: AnchorBalances | Error,
  [asset: string]: EngineBalances | Error
}

export const balances: AssetBalances = {
  [Asset.BTC]: new Error('Not retrieved'),
  [Asset.USDX]: new Error('Not retrieved')
}

export const balanceUpdater = new EventEmitter()

function isAnchorBalance (balances: EngineBalances): balances is AnchorBalances {
  return balances.total.asset === Asset.USDX
}

function isLndBalance (balances: EngineBalances): balances is LndBalances {
  return balances.total.asset === Asset.BTC
}

export function isUSDXSufficient (usdxCents: number): boolean {
  const usdxBalances = balances[Asset.USDX]
  if (usdxBalances instanceof Error) {
    return false
  }
  return usdxCents <= usdxBalances.available.value
}

export function engineBalancesHaveUpdated (oldBalances: EngineBalances | Error,
  newBalances: EngineBalances | Error): boolean {
  if (oldBalances instanceof Error) {
    if (newBalances instanceof Error) {
      return oldBalances.message !== newBalances.message
    }

    return true
  }

  if (newBalances instanceof Error) {
    return true
  }

  if (oldBalances.total.value !== newBalances.total.value) {
    return true
  }

  if (oldBalances.holds.value !== newBalances.holds.value) {
    return true
  }

  if (isAnchorBalance(oldBalances) && isAnchorBalance(newBalances)) {
    return oldBalances.available.value !== newBalances.available.value
  }

  if (isLndBalance(oldBalances) && isLndBalance(newBalances)) {
    return oldBalances.lightning.value !== newBalances.lightning.value ||
      oldBalances.onChain.value !== newBalances.onChain.value
  }

  throw new Error(`Mismatched or invalid balance types: ` +
    `${oldBalances.total.asset}/${newBalances.total.asset}`)
}

export async function getBalances (asset: Asset, manualUpdate = false): Promise<EngineBalances | Error> {
  const existingAssetBalances = balances[asset]

  try {
    const assetBalances = await requestAssetBalances(asset)
    if (assetBalances == null) {
      throw new Error(`${asset} engine is not validated`)
    }

    // typescript is not a fan of assignment here
    // since the LndBalances and AnchorBalances types
    // are not quite the same.
    if (asset === Asset.USDX) {
      if (!isAnchorBalance(assetBalances)) {
        throw new Error(`Invalid balance for ${Asset.USDX}`)
      }
      balances[Asset.USDX] = assetBalances
    } else if (asset === Asset.BTC) {
      if (!isLndBalance(assetBalances)) {
        throw new Error(`Invalid balance for ${Asset.BTC}`)
      }
      balances[Asset.BTC] = assetBalances
    }

    if (engineBalancesHaveUpdated(existingAssetBalances, assetBalances)) {
      balanceUpdater.emit('update', manualUpdate)
    }
  } catch (e) {
    balances[asset] = e

    if (engineBalancesHaveUpdated(existingAssetBalances, balances[asset])) {
      logger.error(`Error while retrieving ${asset} balances: ${e}`)
      balanceUpdater.emit('update', manualUpdate)
    }
  }

  return balances[asset]
}

async function pollBalances (): Promise<never> {
  while (true) {
    Object.keys(balances).forEach(asset => getBalances(valueToEnum(Asset, asset)))
    await delay(POLL_BALANCE_DELAY)
  }
}

// stay running for the life of the process
pollBalances()
