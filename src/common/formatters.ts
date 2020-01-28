import { Amount, Asset } from '../global-shared/types'
import { toUSDX, toBTC } from './currency-conversions'

const BTC_FORMAT_OPTIONS = {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8
}

export function formatDollarValue (value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatBtcValue (value: number): string {
  return (value).toLocaleString('en-US', BTC_FORMAT_OPTIONS)
}

export function formatAmount (amount: Amount): string {
  switch (amount.asset) {
    case Asset.BTC:
      return formatBtcValue(toBTC(amount.value))
    case Asset.USDX:
      return formatDollarValue(toUSDX(amount.value))
    default:
      throw new Error(`Unknown asset type. Cannot format asset ${amount.asset}`)
  }
}
