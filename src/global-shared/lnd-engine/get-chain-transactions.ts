import { promisify } from 'util'
import { LndActionOptions, ChainTransaction } from '../types/lnd-engine/client'
import { deadline } from './deadline'

export async function getChainTransactions ({ client }: LndActionOptions): Promise<ChainTransaction[]> {
  const getTransactions = promisify(client.getTransactions).bind(client)

  const { transactions } = await getTransactions({}, { deadline: deadline() })
  return transactions
}
