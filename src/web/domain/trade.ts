import { Amount, Asset, Unit } from '../../global-shared/types'
import { QuoteResponse } from '../../global-shared/types/server'
import { isValidQuantity, toSatoshis } from './quantity'
import { sendExecuteTrade } from './main-request'

async function executeTrade (btcQuantity: number, quote: QuoteResponse): Promise<void> {
  if (!isValidQuantity(btcQuantity)) {
    throw new Error(`Invalid quantity: ${btcQuantity} BTC`)
  }

  const destinationAmount: Amount = {
    asset: Asset.BTC,
    unit: Unit.Satoshi,
    value: toSatoshis(btcQuantity)
  }

  await sendExecuteTrade({
    hash: quote.hash,
    sourceAmount: quote.sourceAmount,
    destinationAmount
  })
}

export default executeTrade
