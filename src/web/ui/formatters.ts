import { Amount, Asset } from '../../global-shared/types'
import { centsPerUSD, satoshisPerBTC } from '../../common/constants'

const DATE_FORMAT_OPTIONS = {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric'
}

const BTC_FORMAT_OPTIONS = {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8
}

const ASSET_DISPLAY_SYMBOL = {
  [Asset.BTC]: 'BTC',
  [Asset.USDX]: 'USD'
}

export function formatDollarValue (value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatBtcValue (value: number): string {
  return (value).toLocaleString('en-US', BTC_FORMAT_OPTIONS)
}

export function formatPercent (value: number): string {
  return (value * 100).toFixed(2) + '%'
}

export function formatDate (date: Date): string {
  return date.toLocaleDateString('default', DATE_FORMAT_OPTIONS)
}

export function formatAmount (amount: Amount): string {
  switch (amount.asset) {
    case Asset.BTC:
      return formatBtcValue(amount.value / satoshisPerBTC)
    case Asset.USDX:
      return formatDollarValue(amount.value / centsPerUSD)
    default:
      throw new Error(`Unknown asset type. Cannot format asset ${amount.asset}`)
  }
}

export function formatAsset (asset: Asset): string {
  return ASSET_DISPLAY_SYMBOL[asset]
}
