import { Amount, Asset, assetToUnit } from '../../global-shared/types'
import { centsPerUSD, satoshisPerBTC } from '../../common/constants'

export function altAsset (asset: Asset): Asset {
  if (asset === Asset.BTC) return Asset.USDX
  return Asset.BTC
}

export function altValue (startAsset: Asset, startValue: number, currentPrice: number): number {
  const quantumPrice = currentPrice * centsPerUSD / satoshisPerBTC

  // The server will round cents in their favor, so we simulate that here
  if (startAsset === Asset.BTC) return Math.ceil(startValue * quantumPrice)
  return Math.floor(startValue / quantumPrice)
}

export function altAmount (amt: Amount, currentPrice: number): Amount {
  return {
    asset: altAsset(amt.asset),
    unit: assetToUnit(altAsset(amt.asset)),
    value: altValue(amt.asset, amt.value, currentPrice)
  }
}
