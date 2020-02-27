import { getAuth } from './auth'
import { serverRequest as baseRequest } from '../common/utils'
import { API_ENDPOINTS } from '../global-shared/api'
import {
  ServerAddressResponse,
  KYCResponse,
  StatusResponse,
  RegisterRequest
} from '../global-shared/types/server'
import { Asset, PaymentChannelNetworkAddress } from '../global-shared/types'
import { UnknownJSON } from '../global-shared/fetch-json'

function serverRequest (path: string, data: object = {}): Promise<UnknownJSON> {
  return baseRequest(path, data, getAuth)
}

export async function getServerAddress (asset: Asset): Promise<ServerAddressResponse> {
  const res = await serverRequest(API_ENDPOINTS.ADDRESS, { asset })

  // TODO: use a JSON schema / type guard to check the shape
  return res as unknown as ServerAddressResponse
}

export async function submitKYC (identifier: string): Promise<KYCResponse> {
  const response = await serverRequest(API_ENDPOINTS.SUBMIT_KYC, { identifier })
  return response as unknown as KYCResponse
}

export async function execute (hash: string,
  sourceAddress: PaymentChannelNetworkAddress,
  destinationAddress: PaymentChannelNetworkAddress): Promise<void> {
  const data = { hash, sourceAddress, destinationAddress }
  await serverRequest(API_ENDPOINTS.EXECUTE, data)
}

export async function getEmail (): Promise<string | null> {
  try {
    const response = await serverRequest(API_ENDPOINTS.EMAIL)
    const { email } = response as unknown as { email: string }
    return email
  } catch (e) {
    return null
  }
}

export async function getStatus (): Promise<StatusResponse> {
  const res = await serverRequest(API_ENDPOINTS.STATUS)
  return res as unknown as StatusResponse
}

export async function register (registerRequest: RegisterRequest): Promise<void> {
  await serverRequest(API_ENDPOINTS.REGISTER, registerRequest)
}
