import { Asset, Amount, assetToUnit } from '../global-shared/types'

export const centsPerUSD = 100
export const satoshisPerBTC = 100000000

export function toBTC (satoshis: number): number {
  return satoshis / satoshisPerBTC
}

export function toUSDX (cents: number): number {
  return parseFloat((cents / centsPerUSD).toFixed(2))
}

export function toSatoshis (btcQuantity: number): number {
  return Math.round(btcQuantity * satoshisPerBTC)
}

export function toCents (usdxQuantity: number): number {
  return Math.round(usdxQuantity * centsPerUSD)
}

const toQuantumFns = {
  [Asset.BTC]: toSatoshis,
  [Asset.USDX]: toCents
}

export function toQuantum (asset: Asset, quantity: number): number {
  return toQuantumFns[asset](quantity)
}

export function toAmount (asset: Asset, quantity: number): Amount {
  return {
    asset,
    unit: assetToUnit(asset),
    value: toQuantum(asset, quantity)
  }
}

export function asAmount (asset: Asset, quantums: number): Amount {
  return {
    asset,
    unit: assetToUnit(asset),
    value: quantums
  }
}

export function toCommonPrice (satoshis: number, cents: number): Amount {
  const btc = toBTC(satoshis)
  const usdx = toUSDX(cents)

  return toAmount(Asset.USDX, usdx / btc)
}

const toCommonFns = {
  [Asset.BTC]: toBTC,
  [Asset.USDX]: toUSDX
}

export function toCommon (asset: Asset, quantums: number): number {
  return toCommonFns[asset](quantums)
}
