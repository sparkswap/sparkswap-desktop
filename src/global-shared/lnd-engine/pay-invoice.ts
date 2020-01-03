import { SendPaymentState } from '../types/lnd-engine/client/router'
import { LndActionOptions } from '../types/lnd-engine/client'

// Default value of invoice timeout taken from the original `sendPayment` Lightning rpc
// which is 60 seconds.
const INVOICE_TIMEOUT_IN_SECONDS = 60

// We set the invoice fee limit to the max value of int64, which is the recommended
// value for an `unlimited` fee limit from LND
const INVOICE_FEE_LIMIT = '9223372036854775807'

export function payInvoice (paymentRequest: string, { client, logger }: LndActionOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.debug('Attempting to pay invoice')

    const call = client.router.sendPayment({
      paymentRequest,
      timeoutSeconds: INVOICE_TIMEOUT_IN_SECONDS,
      feeLimitSat: INVOICE_FEE_LIMIT
    })

    call.on('data', (data) => {
      switch (data.state) {
        case SendPaymentState.IN_FLIGHT:
          logger.debug('Payment is inflight')
          break
        case SendPaymentState.SUCCEEDED:
          logger.info('Paid invoice successfully')
          return resolve()
        default:
          return reject(new Error(`Payment failed as ${data.state}`))
      }
    })

    call.on('error', (err) => reject(err))
  })
}
