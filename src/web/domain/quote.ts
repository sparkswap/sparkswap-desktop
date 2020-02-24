import { Amount, Asset } from '../../global-shared/types'
import { isValidAmount } from './quantity'
import * as server from './server'
import { marketDataSubscriber } from './market-data'
import { BalanceError } from '../../common/errors'
import { Quote } from '../../common/types'
import { quoteSetupSec } from '../../common/constants'
import { balances, isUSDXSufficient } from './balance'
import { altValue } from './convert-amount'

interface BtcQuoteParams {
  destinationAmount: Amount
}

interface UsdxQuoteParams {
  sourceAmount: Amount
}

type QuoteParams = BtcQuoteParams | UsdxQuoteParams

async function getQuote (params: QuoteParams): Promise<Quote> {
  const startQuoteTime = Date.now()

  const quoteRes = await server.getQuote(params)

  return {
    hash: quoteRes.hash,
    destinationAmount: quoteRes.destinationAmount,
    sourceAmount: quoteRes.sourceAmount,
    // since `startQuoteTime` is before the server executes, this is
    // a conservative estimate (i.e. it is probably a few hundred milliseconds
    // earlier than the actual expiration on the server)
    expiration: new Date(startQuoteTime + quoteRes.duration * 1000)
  }
}

async function getBtcQuote (btcAmount: Amount): Promise<Quote> {
  const quote = await getQuote({ destinationAmount: btcAmount })

  // sanity check the server's quote
  if (quote.destinationAmount.value !== btcAmount.value) {
    throw new Error('Server responded with invalid destination amount.')
  }

  return quote
}

async function getUsdxQuote (usdxAmount: Amount): Promise<Quote> {
  const quote = await getQuote({ sourceAmount: usdxAmount })

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

function validateAmount (amount: Amount): Amount {
  if (!isValidAmount(amount)) {
    throw new Error(`Invalid quantity`)
  }

  if (marketDataSubscriber.currentPrice == null) {
    throw new Error('Unable to execute buy before prices load')
  }

  const usdBalances = balances[Asset.USDX]

  if (usdBalances instanceof Error) {
    throw new Error('Unable to execute buy before USD balance loads')
  } else if (usdBalances.total.value === 0) {
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

export function requestQuote (amount: Amount): Promise<Quote> {
  const validatedAmount = validateAmount(amount)

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

// Get an approximate number of seconds until the user can no longer
// accept a quote, accounting for the amount of time it will take us to setup.
export function getQuoteUserDuration (quote: Quote): number {
  return Math.round((quote.expiration.getTime() - Date.now()) / 1000) - quoteSetupSec
}
