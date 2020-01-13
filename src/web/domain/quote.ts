import { Amount, Asset } from '../../global-shared/types'
import { QuoteResponse } from '../../global-shared/types/server'
import { isValidAmount } from './quantity'
import * as server from './server'
import { marketDataSubscriber } from './market-data'
import { isClockSynced, checkClockSynced } from './system-clock'
import { BalanceError } from '../../common/errors'
import { balances, isUSDXSufficient } from './balance'
import { altValue } from './convert-amount'

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

// Calculates the amount of time remaining for a human to act
// on a quote
export function getQuoteUserDuration (quote: QuoteResponse): number {
  // subtract 5 seconds from the quote duration because if the user clicks
  // the confirm button right before the countdown hits zero, we still have
  // to make a network round trip before the client's invoice gets an HTLC,
  // and this invoice's expiration is set based on the quote duration.
  return Math.max(quote.duration - 5, 0)
}

async function validateAmount (amount: Amount): Promise<Amount> {
  if (!isValidAmount(amount)) {
    throw new Error(`Invalid quantity`)
  }

  if (!isClockSynced) {
    await checkClockSynced()
    if (!isClockSynced) {
      throw new Error('The system clock is inaccurate, please update the time')
    }
  }

  if (marketDataSubscriber.currentPrice == null) {
    throw new Error('Unable to execute buy before prices load')
  }

  const usdBalance = balances[Asset.USDX]

  if (usdBalance instanceof Error) {
    throw new Error('Unable to execute buy before USD balance loads')
  } else if (usdBalance.value === 0) {
    throw new BalanceError('Deposit before executing buy', Asset.USDX)
  }

  const usdxQuantity = amount.asset === Asset.USDX
    ? amount.value
    : altValue(amount.asset, amount.value, marketDataSubscriber.currentPrice)

  if (!isUSDXSufficient(usdxQuantity)) {
    throw new BalanceError('Insufficient USD for buy', Asset.USDX)
  }

  return amount
}

export async function requestQuote (amount: Amount): Promise<QuoteResponse> {
  const validatedAmount = await validateAmount(amount)

  try {
    return quoteFns[amount.asset](validatedAmount)
  } catch (e) {
    if (e.status === 403) {
      throw new Error('Your account must be approved prior to trading')
    } else {
      throw new Error(`Failed to get quote: ${e.message}`)
    }
  }
}
