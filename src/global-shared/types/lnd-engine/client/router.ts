interface SendPaymentRequest {
  paymentRequest: string,
  feeLimitSat: string,
  timeoutSeconds: number
}

export enum SendPaymentState {
  IN_FLIGHT = 'IN_FLIGHT',
  SUCCEEDED = 'SUCCEEDED',
  FAILED_TIMEOUT = 'FAILED_TIMEOUT',
  FAILED_NO_ROUTE = 'FAILED_NO_ROUTE'
}

interface SendPaymentResponse {
  state: SendPaymentState
}

interface SendPaymentResponseCall {
  on(event: 'data', listener: (chunk: SendPaymentResponse) => void): this,
  on(event: 'status', listener: (chunk: unknown) => void): this,
  on(event: 'error', listener: (error: Error) => void): this,
  on(event: 'end', listener: () => void): this,
  end (): this
}

export interface LndRouter {
  sendPayment (request: SendPaymentRequest): SendPaymentResponseCall
}
