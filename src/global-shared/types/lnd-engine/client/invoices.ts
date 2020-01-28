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
  rHash: Buffer,
  rPreimage: Buffer,
  value: string,
  amtPaidSat: string,
  expiry: string,
  cltvExpiry: string,
  paymentRequest: string,
  creationDate: string
}

interface SubscribeSingleInvoiceRequest {
  rHash: Buffer
}

export interface LndInvoices {
  subscribeSingleInvoice: (req: SubscribeSingleInvoiceRequest) => GrpcCall<Invoice>
}
