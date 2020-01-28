import { GrpcCall } from './grpc'

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

export interface LndRouter {
  sendPayment (request: SendPaymentRequest): GrpcCall<SendPaymentResponse>
}
