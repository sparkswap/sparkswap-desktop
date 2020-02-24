import { getAuth } from './main-request'
import { serverRequest as baseRequest } from '../../common/utils'
import { API_ENDPOINTS } from '../../common/config'
import { valueToEnum } from '../../global-shared/util'
import { Asset, Unit } from '../../global-shared/types'
import {
  MarketDataResponse,
  StatusResponse,
  QuoteResponse,
  JurisdictionWhitelistResponse,
  KYCUploadRequest,
  KYCUploadResponse,
  VerifyPhoneResponse,
  ProofOfKeysResponse
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

export async function register (data: object): Promise<void> {
  await serverRequest(API_ENDPOINTS.REGISTER, data)
}

export async function getStatus (): Promise<StatusResponse> {
  const res = await serverRequest(API_ENDPOINTS.STATUS)
  // TODO: use a JSON schema / type guard to check the shape
  return res as unknown as StatusResponse
}

export async function uploadKYC (data: KYCUploadRequest): Promise<KYCUploadResponse> {
  const res = await serverRequest(API_ENDPOINTS.UPLOAD_KYC, data)
  return res as unknown as KYCUploadResponse
}

export async function submitPhoneVerificationCode (data: object): Promise<VerifyPhoneResponse> {
  const res = await serverRequest(API_ENDPOINTS.VERIFY_PHONE, data)
  return res as unknown as VerifyPhoneResponse
}

export async function startBerbix (): Promise<void> {
  await serverRequest(API_ENDPOINTS.START_BERBIX, {})
}

export async function finishBerbix (): Promise<void> {
  await serverRequest(API_ENDPOINTS.FINISH_BERBIX)
}

export async function submitPhotoId (): Promise<void> {
  await serverRequest(API_ENDPOINTS.SUBMIT_PHOTO_ID)
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
    asset: valueToEnum(Asset, sourceAmountRes.asset),
    unit: valueToEnum(Unit, sourceAmountRes.unit),
    value: sourceAmountRes.value as number
  }

  const destinationAmount = {
    asset: valueToEnum(Asset, destinationAmountRes.asset),
    unit: valueToEnum(Unit, destinationAmountRes.unit),
    value: destinationAmountRes.value as number
  }

  return {
    sourceAmount,
    destinationAmount,
    duration,
    hash
  }
}

export async function getApprovedJurisdictions (): Promise<JurisdictionWhitelistResponse> {
  const res = await serverRequest(API_ENDPOINTS.LOCATION_WHITELIST)
  return res as unknown as JurisdictionWhitelistResponse
}

export async function getProofOfKeys (): Promise<ProofOfKeysResponse> {
  const res = await serverRequest(API_ENDPOINTS.GET_PROOF)

  return res as unknown as ProofOfKeysResponse
}
