import { QuoteResponse } from '../../global-shared/types/server'
import { sendExecuteTrade } from './main-request'

async function executeTrade (quote: QuoteResponse): Promise<void> {
  await sendExecuteTrade(quote)
}

export default executeTrade
