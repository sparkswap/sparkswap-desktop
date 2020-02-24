import {
  Amount,
  Asset,
  Unit
} from '../../global-shared/types'
import { QuantityError } from '../../common/errors'
import { formatAmount, formatAsset } from '../../common/formatters'
import { altAmount } from './convert-amount'
import { toSatoshis, toCents, toAmount } from '../../global-shared/currency-conversions'

export const MIN_QUANTITY_BTC = 0.00000001 // one satoshi
export const MIN_QUANTITY_SAT = toSatoshis(MIN_QUANTITY_BTC)
export const MIN_AMOUNT_BTC = {
  asset: Asset.BTC,
  unit: Unit.Satoshi,
  value: MIN_QUANTITY_SAT
}
// See: https://github.com/lightningnetwork/lnd/blob/4e62e8ae676b23e1b92c9160cb749ceb6964bd7c/rpcserver.go#L62
export const MAX_QUANTITY_BTC = 0.04294967
export const MAX_QUANTITY_SAT = toSatoshis(MAX_QUANTITY_BTC)
export const MAX_AMOUNT_BTC = {
  asset: Asset.BTC,
  unit: Unit.Satoshi,
  value: MAX_QUANTITY_SAT
}

export const MIN_QUANTITY_USDX = 0.01 // one cent
export const MIN_QUANTITY_CENT = toCents(MIN_QUANTITY_USDX)
export const MIN_AMOUNT_USDX = {
  asset: Asset.USDX,
  unit: Unit.Cent,
  value: MIN_QUANTITY_CENT
}
export const MAX_QUANTITY_USDX = 100000000 // $100m USD. Contact Sparkswap to upgrade your client if you need more.
export const MAX_QUANTITY_CENT = toCents(MAX_QUANTITY_USDX)
export const MAX_AMOUNT_USDX = {
  asset: Asset.USDX,
  unit: Unit.Cent,
  value: MAX_QUANTITY_CENT
}

export function isValidBtcQuantity (btcQuantity: number): boolean {
  const satoshis = toSatoshis(btcQuantity)
  return isValidAmount({
    asset: Asset.BTC,
    unit: Unit.Satoshi,
    value: satoshis
  })
}

export function isValidUsdxQuantity (usdxQuantity: number): boolean {
  const cents = toCents(usdxQuantity)
  return isValidAmount({
    asset: Asset.USDX,
    unit: Unit.Cent,
    value: cents
  })
}

const isValidFns = {
  [Asset.BTC]: isValidBtcQuantity,
  [Asset.USDX]: isValidUsdxQuantity
}

export function isValidQuantity (asset: Asset, quantity: number): boolean {
  return isValidFns[asset](quantity)
}

export function isValidAmount (amount: Amount): boolean {
  return !isNaN(amount.value) &&
    amount.value >= MIN_AMOUNT[amount.asset].value &&
    amount.value <= MAX_AMOUNT[amount.asset].value
}

export const MIN_QUANTITY = {
  [Asset.BTC]: MIN_QUANTITY_BTC,
  [Asset.USDX]: MIN_QUANTITY_USDX
}

export const MIN_AMOUNT = {
  [Asset.BTC]: MIN_AMOUNT_BTC,
  [Asset.USDX]: MIN_AMOUNT_USDX
}

export const MAX_QUANTITY = {
  [Asset.BTC]: MAX_QUANTITY_BTC,
  [Asset.USDX]: MAX_QUANTITY_USDX
}

export const MAX_AMOUNT = {
  [Asset.BTC]: MAX_AMOUNT_BTC,
  [Asset.USDX]: MAX_AMOUNT_USDX
}

export function validateQuantity (asset: Asset, quantity: number, currentPrice: number): Amount {
  const alternateAmount = altAmount(toAmount(asset, quantity), currentPrice)

  if (quantity < MIN_QUANTITY[asset]) {
    throw new QuantityError(`Minimum quantity is ${formatAmount(MIN_AMOUNT[asset], { includeAsset: true })}`, asset)
  } else if (quantity > MAX_QUANTITY[asset]) {
    throw new QuantityError(`Maximum quantity is ${formatAmount(MAX_AMOUNT[asset], { includeAsset: true })}`, asset)
  } else if (alternateAmount.value < MIN_AMOUNT[alternateAmount.asset].value) {
    throw new QuantityError(`Minimum quantity is ${formatAmount(MIN_AMOUNT[alternateAmount.asset], { includeAsset: true })}}`, asset)
  } else if (alternateAmount.value > MAX_AMOUNT[alternateAmount.asset].value) {
    throw new QuantityError(`Maximum quantity is ${formatAmount(MAX_AMOUNT[alternateAmount.asset], { includeAsset: true })}`, asset)
  }

  if (isValidQuantity(asset, quantity) && isValidAmount(alternateAmount)) {
    return toAmount(asset, quantity)
  }

  throw new QuantityError(`Invalid ${formatAsset(asset)} quantity`, asset)
}
