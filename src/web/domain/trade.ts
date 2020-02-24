import { Quote } from '../../common/types'
import { sendExecuteTrade } from './main-request'
import { delay } from '../../global-shared/util'
import { getBalances } from './balance'
import { Asset } from '../../global-shared/types'

async function executeTrade (quote: Quote): Promise<void> {
  await sendExecuteTrade(quote)

  // This delay is necessary since LND doesn't update balance immediately after executeTrade
  await delay(200)
  getBalances(Asset.USDX)
  getBalances(Asset.BTC)
}

export default executeTrade
