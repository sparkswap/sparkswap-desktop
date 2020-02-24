import * as grpc from 'grpc'
import { LndActionOptions } from '../types/lnd-engine/client'
import { GrpcError } from '../types/lnd-engine/client/grpc'
import {
  Invoice,
  InvoiceState
} from '../types/lnd-engine/client/invoices'
import LndEngine from 'lnd-engine'

const {
  ExpiredSwapError,
  CanceledSwapError,
  SettledSwapError
} = LndEngine.ERRORS

export function waitForSwapCommitment (swapHash: string, expiration: Date, { client }: LndActionOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timer

    // subscribeSingleInvoice always sends out the initial invoice state
    const stream = client.invoices.subscribeSingleInvoice({ rHash: swapHash })

    const cleanup = (): void => {
      stream.removeAllListeners()
      // stop the timer on invoice expiration if it is still active
      if (timer) {
        clearTimeout(timer)
      }
    }

    const errHandler = (e: GrpcError): void => {
      // CANCELLED events get emitted when we call `stream.cancel()`
      // so we want to handle those as expected, not errors
      if (e.code !== grpc.status.CANCELLED) {
        reject(e)
      }
      cleanup()
    }

    stream.on('error', errHandler)

    stream.on('end', () => {
      reject(new Error(`Stream ended while waiting for commitment for swap iwth hash (${swapHash})`))
      cleanup()
    })

    stream.on('data', (invoice: Invoice) => {
      switch (invoice.state) {
        case InvoiceState.OPEN:
          // if the invoice is open but expired, throw an error
          // indicating that.
          if (new Date() > expiration) {
            reject(new ExpiredSwapError(`Swap with hash (${swapHash}) is expired.`))
            stream.cancel()
            return
          }
          // once the invoice is expired, treat it as such
          if (!timer) {
            timer = setTimeout(() => {
              reject(new ExpiredSwapError(`Swap with hash (${swapHash}) is expired.`))
              stream.cancel()
            }, expiration.getTime() - (new Date()).getTime())
          }
          break
        case InvoiceState.SETTLED:
          reject(new SettledSwapError(`Swap with hash (${swapHash}) is already settled.`))
          stream.cancel()
          break
        case InvoiceState.CANCELED:
          reject(new CanceledSwapError(`Swap with hash (${swapHash}) is canceled.`))
          stream.cancel()
          break
        case InvoiceState.ACCEPTED:
          resolve()
          stream.cancel()
          break
      }
    })
  })
}
