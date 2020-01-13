import { QuoteResponse } from '../../global-shared/types/server'
import { sendExecuteTrade } from './main-request'
import { delay } from '../../global-shared/util'
import { getBalanceState } from './balance'
import { Asset } from '../../global-shared/types'

async function executeTrade (quote: QuoteResponse): Promise<void> {
  await sendExecuteTrade(quote)

  // This delay is necessary since LND doesn't update balance immediately after executeTrade
  delay(200)
  getBalanceState(Asset.USDX)
  getBalanceState(Asset.BTC)
}

export default executeTrade
