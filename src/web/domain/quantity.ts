import { satoshisPerBTC, centsPerUSD } from '../../common/constants'

// TODO: determine the exact minimum amount
export const MIN_QUANTITY = 0.00001
export const MIN_QUANTITY_SAT = Math.round(MIN_QUANTITY * satoshisPerBTC)
// See: https://github.com/lightningnetwork/lnd/blob/4e62e8ae676b23e1b92c9160cb749ceb6964bd7c/rpcserver.go#L62
export const MAX_QUANTITY = 0.04294967
export const MAX_QUANTITY_SAT = Math.round(MAX_QUANTITY * satoshisPerBTC)

export function toSatoshis (btcQuantity: number): number {
  return Math.round(btcQuantity * satoshisPerBTC)
}

export function isValidQuantity (btcQuantity: number): boolean {
  const satoshis = toSatoshis(btcQuantity)
  return !isNaN(satoshis) && satoshis >= MIN_QUANTITY_SAT && satoshis <= MAX_QUANTITY_SAT
}

export function toCents (usdxQuantity: number): number {
  return Math.round(usdxQuantity * centsPerUSD)
}
