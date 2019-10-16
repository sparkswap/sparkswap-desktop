import { getAuth } from './main-request'
import { serverRequest as baseRequest } from '../../common/utils'
import { API_ENDPOINTS } from '../../common/config'
import { valueToAsset, valueToUnit } from '../../global-shared/types'
import {
  MarketDataResponse,
  RegisterResponse,
  QuoteResponse,
  LocationWhitelistResponse
} from '../../global-shared/types/server'
import { UnknownJSON, isUnknownJSON } from '../../global-shared/fetch-json'

function serverRequest (path: string, data: object = {}): Promise<UnknownJSON> {
  return baseRequest(path, data, getAuth)
}

export async function getMarketData (): Promise<MarketDataResponse> {
  const res = await serverRequest(API_ENDPOINTS.MARKET_DATA)

  // TODO: use a JSON schema / type guard to check the shape
  return res as unknown as MarketDataResponse
}

export async function register (data: object): Promise<RegisterResponse> {
  const res = await serverRequest(API_ENDPOINTS.REGISTER, data)

  // TODO: use a JSON schema / type guard to check the shape
  return res as unknown as RegisterResponse
}

export async function getQuote (data: object): Promise<QuoteResponse> {
  const res = await serverRequest(API_ENDPOINTS.QUOTE, data)

  // TODO: use a JSON schema / type guard to check the shape / do conversion
  const sourceAmountRes = res.sourceAmount
  const destinationAmountRes = res.destinationAmount
  const duration = res.duration as number
  const hash = res.hash as string

  if (!isUnknownJSON(sourceAmountRes) || !isUnknownJSON(destinationAmountRes)) {
    throw new Error(`Bad response for quote: ${res}`)
  }

  const sourceAmount = {
    asset: valueToAsset(sourceAmountRes.asset as string),
    unit: valueToUnit(sourceAmountRes.unit as string),
    value: sourceAmountRes.value as number
  }

  const destinationAmount = {
    asset: valueToAsset(destinationAmountRes.asset as string),
    unit: valueToUnit(destinationAmountRes.unit as string),
    value: destinationAmountRes.value as number
  }

  return {
    sourceAmount,
    destinationAmount,
    duration,
    hash
  }
}

export async function getApprovedLocations (): Promise<LocationWhitelistResponse> {
  const res = await serverRequest(API_ENDPOINTS.LOCATION_WHITELIST)
  return res as unknown as LocationWhitelistResponse
}
