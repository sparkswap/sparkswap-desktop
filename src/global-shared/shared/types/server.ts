import {
  PaymentChannelNetworkAddress,
  ReviewStatus,
  Amount,
  SwapHash,
  URL
} from './'

export interface ServerAddressResponse {
  address: PaymentChannelNetworkAddress
}

export interface RegisterResponse {
  reviewStatus: ReviewStatus
}

export interface HistoricalDataResponse {
  [dateStr: string]: number
}

export interface MarketDataResponse {
  historicalData: HistoricalDataResponse,
  currentPrice: number | null
}

export interface QuoteResponse {
  sourceAmount: Amount,
  duration: number,
  hash: SwapHash
}

export interface KYCResponse {
  url: URL
}
