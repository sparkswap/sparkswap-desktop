import React, { ReactNode } from 'react'
import { Amount, Asset, assetToUnit, Nullable } from '../../global-shared/types'
import { centsPerUSD, satoshisPerBTC } from '../../common/constants'
import { altAmount, altAsset } from '../domain/convert-amount'
import { toAmount } from '../domain/quantity'
import { Frequency } from '../../common/types'

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

export function addMutedSpan (text: string): ReactNode {
  const reversed = text.split('').reverse().join('')
  let reverseIndex = 0

  while (reversed[reverseIndex] === '0' || reversed[reverseIndex] === '.') {
    reverseIndex++
  }

  const index = text.length - reverseIndex

  return (
    <React.Fragment>
      {text.slice(0, index)}<span className='text-muted'>{text.slice(index)}</span>
    </React.Fragment>
  )
}

export function getAltAmount (asset: Asset, quantityStr: string, currentPrice: Nullable<number>): Amount {
  if (currentPrice == null) {
    return {
      asset: altAsset(asset),
      unit: assetToUnit(altAsset(asset)),
      value: 0
    }
  }

  const value = parseFloat(quantityStr) > 0 ? parseFloat(quantityStr) : 0
  return altAmount(toAmount(asset, value), currentPrice)
}

export function formatTimeUnit (frequency: Frequency): string {
  return frequency.interval === 1
    ? frequency.unit.toLowerCase().slice(0, -1)
    : frequency.unit.toLowerCase()
}
