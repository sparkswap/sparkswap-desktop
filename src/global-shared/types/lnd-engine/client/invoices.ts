import { GrpcCall } from './grpc'

export enum InvoiceState {
  OPEN = 'OPEN',
  SETTLED = 'SETTLED',
  CANCELED = 'CANCELED',
  ACCEPTED = 'ACCEPTED'
}

export interface Invoice {
  state: InvoiceState,
  memo: string,
  rHash: string, // base64
  rPreimage: string, // base64
  value: string,
  amtPaidSat: string,
  expiry: string,
  cltvExpiry: string,
  paymentRequest: string,
  creationDate: string, // int64
  settleDate: string // int64
}

interface SubscribeSingleInvoiceRequest {
  rHash: string // base64
}

export interface LndInvoices {
  subscribeSingleInvoice: (req: SubscribeSingleInvoiceRequest) => GrpcCall<Invoice>
}
