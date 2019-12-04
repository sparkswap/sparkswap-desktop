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

export function getQuote (amount: Amount): Promise<QuoteResponse> {
  if (!isValidAmount(amount)) {
    throw new Error(`Invalid quantity`)
  }

  return quoteFns[amount.asset](amount)
}

// Calculates the amount of time remaining for a human to act
// on a quote
export function getQuoteUserDuration (quote: QuoteResponse): number {
  // subtract 5 seconds from the quote duration because if the user clicks
  // the confirm button right before the countdown hits zero, we still have
  // to make a network round trip before the client's invoice gets an HTLC,
  // and this invoice's expiration is set based on the quote duration.
  return Math.max(quote.duration - 5, 0)
}
