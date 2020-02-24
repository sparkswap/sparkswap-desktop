import { promisify } from 'util'
import { LndActionOptions, Payment } from '../types/lnd-engine/client'
import { deadline } from './deadline'

export async function getPayments ({ client }: LndActionOptions): Promise<Payment[]> {
  const listPayments = promisify(client.listPayments).bind(client)

  const { payments } = await listPayments({ includeIncomplete: true }, { deadline: deadline() })
  return payments
}
