import { Amount, Asset } from '../../global-shared/types'
import { QuoteResponse } from '../../global-shared/types/server'
import { isValidAmount } from './quantity'
import * as server from './server'

async function getBtcQuote (btcAmount: Amount): Promise<QuoteResponse> {
  const quote = await server.getQuote({ destinationAmount: btcAmount })

  // sanity check the server's quote
  if (quote.destinationAmount.value !== btcAmount.value) {
    throw new Error('Server responded with invalid destination amount.')
  }

  return quote
}

async function getUsdxQuote (usdxAmount: Amount): Promise<QuoteResponse> {
  const quote = await server.getQuote({ sourceAmount: usdxAmount })

  // sanity check the server's quote
  if (quote.sourceAmount.value !== usdxAmount.value) {
    throw new Error('Server responded with invalid source amount.')
  }

  return quote
}

const quoteFns = {
  [Asset.BTC]: getBtcQuote,
  [Asset.USDX]: getUsdxQuote
}

export async function getQuote (amount: Amount): Promise<QuoteResponse> {
  if (!isValidAmount(amount)) {
    throw new Error(`Invalid quantity`)
  }

  return quoteFns[amount.asset](amount)
}
