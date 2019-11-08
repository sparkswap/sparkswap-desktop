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

export interface StatusResponse {
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
  destinationAmount: Amount,
  duration: number,
  hash: SwapHash
}

export interface KYCResponse {
  url: URL
}

export interface Address {
  street: string,
  city: string,
  state: string,
  postalCode: string,
  country: string
}

export interface Name {
  firstName: string,
  lastName: string
}

export interface KYCUploadRequest {
  name?: Name,
  email?: string,
  jurisdiction?: string,
  phone?: string,
  address?: Address,
  birthdate?: string,
  ssn?: string
}

export interface KYCUploadResponse {
  status: ReviewStatus
}

export interface VerifyPhoneResponse {
  verified: boolean
}

export interface LocationWhitelistResponse {
  regions: string[]
}
