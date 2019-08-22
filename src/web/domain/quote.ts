import { Amount, Asset, Unit } from '../../global-shared/types'
import { QuoteResponse } from '../../global-shared/types/server'
import { isValidQuantity, toSatoshis } from './quantity'
import * as server from './server'

async function getQuote (btcQuantity: number): Promise<QuoteResponse> {
  if (!isValidQuantity(btcQuantity)) {
    throw new Error(`Invalid quantity: ${btcQuantity} BTC`)
  }

  const destinationAmount: Amount = {
    asset: Asset.BTC,
    unit: Unit.Satoshi,
    value: toSatoshis(btcQuantity)
  }

  return server.getQuote({ destinationAmount })
}

export default getQuote
