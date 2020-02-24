import { promisify } from 'util'
import { LndActionOptions } from '../types/lnd-engine/client'
import { Invoice } from '../types/lnd-engine/client/invoices'
import { deadline } from './deadline'

const MAX_INVOICES_PER_REQUEST = 500

export async function getInvoices ({ client }: LndActionOptions): Promise<Invoice[]> {
  const listInvoices = promisify(client.listInvoices).bind(client)

  const invoices: Invoice[] = []
  let indexOffset = 0
  // LND uses the `add_index` of the invoice, which starts at 1
  let lastIndexOffset = 1

  // LND will return `0` as the last index offset when there are no more results
  // to page through
  while (lastIndexOffset !== 0) {
    const listInvoicesRequest = {
      pendingOnly: false,
      indexOffset: indexOffset.toString(),
      numMaxInvoices: MAX_INVOICES_PER_REQUEST.toString()
    }

    const {
      invoices: invoicesRes,
      lastIndexOffset: returnedIndexOffset
    } = await listInvoices(listInvoicesRequest, { deadline: deadline() })

    lastIndexOffset = parseInt(returnedIndexOffset)
    indexOffset = parseInt(returnedIndexOffset)

    invoices.push(...invoicesRes)
  }

  return invoices
}
