import React, { ReactNode } from 'react'
import { Amount, Asset, assetToUnit, Nullable } from '../../global-shared/types'
import { altAmount, altAsset } from '../domain/convert-amount'
import { toAmount } from '../../common/currency-conversions'
import { Frequency } from '../../common/types'

const DATE_FORMAT_OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}

const TIME_FORMAT_OPTIONS = {
  hour: 'numeric',
  minute: 'numeric'
}

const ASSET_DISPLAY_SYMBOL = {
  [Asset.BTC]: 'BTC',
  [Asset.USDX]: 'USD'
}

export function formatPercent (value: number): string {
  return (value * 100).toFixed(2) + '%'
}

export function formatDate (date: Date): string {
  return date.toLocaleDateString('default', DATE_FORMAT_OPTIONS)
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

export function formatTime (date: Date): string {
  return date.toLocaleTimeString([], TIME_FORMAT_OPTIONS)
}

export function formatFrequency (frequency: Frequency): string {
  const unit = formatTimeUnit(frequency)
  return frequency.interval === 1 ? `${unit}` : `${frequency.interval} ${unit}`
}

function formatTimeUnit (frequency: Frequency): string {
  return frequency.interval === 1
    ? frequency.unit.toLowerCase().slice(0, -1)
    : frequency.unit.toLowerCase()
}
