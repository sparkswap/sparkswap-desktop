import { Amount, Asset } from '../global-shared/types'
import { toUSDX, toBTC } from '../global-shared/currency-conversions'

const BTC_FORMAT_OPTIONS = {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8
}

const ASSET_DISPLAY_SYMBOL = {
  [Asset.BTC]: 'BTC',
  [Asset.USDX]: 'USD'
}

export function formatAsset (asset: Asset): string {
  return ASSET_DISPLAY_SYMBOL[asset]
}

export function formatDollarValue (usdxValue: number): string {
  return usdxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatUSDX (centsValue: number): string {
  return formatDollarValue(toUSDX(centsValue))
}

export function formatBtcValue (btcValue: number): string {
  return (btcValue).toLocaleString('en-US', BTC_FORMAT_OPTIONS)
}

function formatBTC (satoshisValue: number): string {
  return formatBtcValue(toBTC(satoshisValue))
}

const AMOUNT_FORMATTERS = {
  [Asset.BTC]: formatBTC,
  [Asset.USDX]: formatUSDX
}

export interface FormatOptions {
  includeAsset?: boolean,
  includeSign?: boolean
}

export function formatAmount (amount: Amount, options?: FormatOptions): string {
  const parts: string[] = []

  if (options && options.includeSign && amount.value !== 0) {
    parts.push(amount.value >= 0 ? '+' : '-')
  }

  parts.push(AMOUNT_FORMATTERS[amount.asset](Math.abs(amount.value)))

  if (options && options.includeAsset) {
    parts.push(formatAsset(amount.asset))
  }

  return parts.join(' ')
}

export function sliceMiddle (str: string, maxLength: number, replaceWith = '...'): string {
  if (str.length < maxLength) {
    return str
  }

  const overage = str.length - maxLength + replaceWith.length
  const halfway = Math.ceil(str.length / 2)
  const firstHalf = str.slice(0, halfway - Math.floor(overage / 2))
  const secondHalf = str.slice(halfway + Math.ceil(overage / 2))

  return `${firstHalf}${replaceWith}${secondHalf}`
}
