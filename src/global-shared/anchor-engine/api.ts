import request, { RequestMethods } from './request'
import {
  Amount,
  Unit,
  Asset,
  SwapHash,
  SwapPreimage,
  URL,
  UnknownObject,
  AnchorRegisterResult
} from '../types'
import { valueToEnum } from '../util'
import {
  toAmount,
  toUSDX
} from '../currency-conversions'
import { isUnknownJSON } from '../fetch-json'

export const USDX = 'USDX'
export const USD = 'USD'

interface ListResponse {
  items: unknown[],
  next_page?: string
}

export interface Balance {
  amount: number,
  currency: 'USDX'
}

// see: https://www.anchorusd.com/9c0cba91e667a08e467f038b6e23e3c4/api/index.html#/?id=the-account-object
export interface Account {
  id: string,
  balances: Balance[]
}

// Anchor supports other transaction types, but we filter those out
export enum TransactionType {
  deposit = 'deposit',
  withdraw = 'withdraw'
}

export enum TransactionPaymentType {
  achPull = 'ach_pull',
  wire = 'wire'
}

export enum TransactionStatus {
  created = 'created',
  pending = 'pending',
  executed = 'executed',
  failed = 'failed',
  canceled = 'canceled'
}

// see: https://www.anchorusd.com/9c0cba91e667a08e467f038b6e23e3c4/api/index.html#/?id=the-transaction-object
export interface Transaction {
  id: string,
  startDate: Date,
  type: TransactionType,
  paymentType: TransactionPaymentType,
  amount: Amount,
  feeAmount: Amount,
  status: TransactionStatus,
  fundsMadeImmediatelyAvailable: boolean
}

export enum EscrowStatus {
  pending = 'pending',
  canceled = 'canceled',
  complete = 'complete'
}

export class AnchorError extends Error {
  param?: string
  code?: string
  error?: string
  reason?: string
}

// see: https://www.anchorusd.com/9c0cba91e667a08e467f038b6e23e3c4/api/index.html#/?id=create-escrow
export enum CreateEscrowErrorCodes {
  insufficientFunds = 'insufficient_funds',
  recipientNotFound = 'not_found',
  positiveDurationRequired = 'positive_duration_required',
  duplicateTimeout = 'duplicate_timeout_parameters',
  invalidHashFormat = 'invalid_format',
  futureTimeoutRequired = 'future_timestamp_required'
}

// see: https://www.anchorusd.com/9c0cba91e667a08e467f038b6e23e3c4/api/index.html#/?id=the-escrow-object
// Note: Hashes and preimages are hex on Anchor, but we use base64. So there needs to be a conversion
// prior to sending to the Anchor API or receiving from it.
export interface Escrow {
  id: string,
  created: Date,
  user: string,
  recipient: string,
  amount: Amount,
  status: EscrowStatus,
  timeout: Date,
  hash: SwapHash,
  preimage?: SwapPreimage
}

export interface DepositIntentResponse {
  type: string,
  url: string,
  identifier: string,
  api_key: string
}

function base64ToHex (base64: string): string {
  return Buffer.from(base64, 'base64').toString('hex')
}

function hexToBase64 (hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64')
}

function resToEscrow (res: unknown): Escrow {
  if (!isUnknownJSON(res)) {
    throw new Error(`Invalid escrow response: ${res}`)
  }

  if (res.currency !== USDX) {
    throw new Error(`Invalid escrow currency: ${res.currency}`)
  }

  return {
    id: res.id as string,
    created: new Date(res.created as number * 1000),
    user: res.user as string,
    recipient: res.recipient as string,
    amount: toAmount(Asset.USDX, res.amount as number),
    status: valueToEnum(EscrowStatus, res.status),
    timeout: new Date(res.timeout as number * 1000),
    hash: hexToBase64(res.hash as string),
    preimage: res.preimage ? hexToBase64(res.preimage as string) : undefined
  }
}

function filterUnsupportedTransactions (res: unknown[]): unknown[] {
  return res.filter(tx => {
    if (!isUnknownJSON(tx)) {
      throw new Error(`Invalid transaction response: ${tx}`)
    }
    return tx.type === TransactionType.deposit ||
           tx.type === TransactionType.withdraw
  })
}

function resToTransaction (res: unknown): Transaction {
  if (!isUnknownJSON(res)) {
    throw new Error(`Invalid transaction response: ${res}`)
  }

  if (res.currency !== USDX) {
    throw new Error(`Invalid ${res.type} currency: ${res.currency}`)
  }

  if (res.base_currency !== USD) {
    throw new Error(`Invalid ${res.type} base currency: ${res.base_currency}`)
  }

  if (res.payment_type == null) {
    throw new Error(`Payment type is required for ${res.type} transactions`)
  }

  return {
    id: res.id as string,
    startDate: new Date(res.start_date as number * 1000),
    type: valueToEnum(TransactionType, res.type),
    paymentType: valueToEnum(TransactionPaymentType, res.payment_type),
    amount: toAmount(Asset.USDX, res.base_currency_amount as number),
    feeAmount: toAmount(Asset.USDX, res.fee_amount as number),
    status: valueToEnum(TransactionStatus, res.status),
    fundsMadeImmediatelyAvailable: Boolean(res.funds_made_immediately_available_by)
  }
}

async function pageResults (apiKey: string, path: string, params: object, limit?: number): Promise<unknown[]> {
  const {
    next_page,
    items
  } = await request(apiKey, path, params) as unknown as ListResponse

  // eslint-disable-next-line
  let nextPage = next_page

  while (nextPage && (limit ? items.length < limit : true)) {
    const res = (await request(apiKey, nextPage)) as unknown as ListResponse
    items.push(...res.items)
    nextPage = res.next_page
  }

  return items.slice(0, limit)
}

export async function getOwnAccount (apiKey: string): Promise<Account> {
  const account = await request(apiKey, '/api/account')

  // TODO: runtime checking of response object
  return account as unknown as Account
}

export async function listTransactions (apiKey: string, limit?: number): Promise<Transaction[]> {
  const results = await pageResults(apiKey, '/api/transactions', {}, limit)

  return filterUnsupportedTransactions(results).map(resToTransaction)
}

export async function getEscrow (apiKey: string, id: string): Promise<Escrow> {
  return resToEscrow(await request(apiKey, `/api/escrow/${id}`))
}

async function listEscrows (apiKey: string, hash?: SwapHash, limit?: number): Promise<Escrow[]> {
  const params = hash ? { hash: base64ToHex(hash) } : {}

  const results = await pageResults(apiKey, '/api/escrows', params, limit)

  return results.map(resToEscrow)
}

export async function getEscrowBalance (apiKey: string): Promise<Amount> {
  // We only search for the top 200 escrows here because this call is triggered
  // alot and we dont want to make A TON of calls if the user has > 1000 escrows
  // TODO: Fix this call when Anchor allows us to search by pending escrows
  const escrows = await listEscrows(apiKey, undefined, 200)

  const value = escrows.reduce((value, escrow) => {
    if (escrow.status === EscrowStatus.pending &&
      escrow.amount.asset === Asset.USDX) {
      return value + escrow.amount.value
    }
    return value
  }, 0)

  return {
    asset: Asset.USDX,
    unit: Unit.Cent,
    value
  }
}

export async function getEscrowByHash (apiKey: string, hash: SwapHash, userId?: string, recipientId?: string): Promise<Escrow | null> {
  const escrows = await listEscrows(apiKey, hash, 2)
  if (escrows.length > 1) {
    throw new Error(`More than one escrow with the provided hash: ${hash}`)
  }

  if (escrows.length === 0) {
    return null
  }

  const escrow = escrows[0]

  if (userId && escrow.user !== userId) {
    return null
  }

  if (recipientId && escrow.recipient !== recipientId) {
    return null
  }

  return escrow
}

export async function cancelEscrow (apiKey: string, id: string): Promise<void> {
  await request(apiKey, `/api/escrow/${id}`, {}, { method: RequestMethods.DELETE })
}

export async function createEscrow (apiKey: string, hash: SwapHash, recipientId: string,
  amount: Amount, expiration: Date): Promise<Escrow> {
  const duration = Math.floor((expiration.getTime() - (new Date()).getTime()) / 1000)
  if (duration <= 0) {
    const error = new AnchorError(`Escrow duration is too short (${duration}s)`)
    error.code = CreateEscrowErrorCodes.positiveDurationRequired
    throw error
  }
  const res = await request(
    apiKey,
    `/api/escrow`,
    {
      hash: base64ToHex(hash),
      recipient: recipientId,
      amount: toUSDX(amount.value),
      timeout_duration_from_creation: duration // eslint-disable-line
    },
    { method: RequestMethods.POST }
  )

  return resToEscrow(res)
}

export async function createDepositIntent (apiKey: string, email: string): Promise<DepositIntentResponse> {
  const query = {
    asset_code: 'USD', // eslint-disable-line
    email_address: email // eslint-disable-line
  }

  // We make a request here with no validations because the anchor API will return
  // a 403.
  //
  // The 403 response is to be interpreted as:
  // "Thank you for making an API request to try to create a deposit. Anchor can't
  // create the deposit/return 200 because their deposits require user interaction
  // to be confirmed. Sparkswap needs to send the user to the given URL to complete
  // the deposit interactively."
  const response = await request(apiKey, '/transfer/deposit', query, {
    fetchOptions: { ignoreCodes: [403] }
  })
  return response as unknown as DepositIntentResponse
}

export interface AnchorKyc extends Record<string, string> {
  'name': string,
  'birthday[year]': string,
  'birthday[month]': string,
  'birthday[day]': string,
  'tax-country': string,
  'tax-id-number': string,
  'address[street-1]': string,
  'address[city]': string,
  'address[postal-code]': string,
  'address[region]': string,
  'address[country]': string,
  'primary-phone-number': string,
  'gender': string
}

export interface RegisterResponse {
  result: AnchorRegisterResult,
  url: URL,
  account_id: string
}

export interface SubmitDocumentResponse {
  id: string,
  account_id: string,
  status: string
}

export const SUCCESSFUL_UPLOAD_STATUS = 'uploaded'

// note: the apiKey is not required for this request
export async function register (apiKey: string, identifier: string,
  kycData: AnchorKyc): Promise<RegisterResponse> {
  const data = Object.assign({ identifier }, kycData)
  const response = await request(apiKey, '/api/register',
    data, { method: RequestMethods.POST })
  return response as unknown as RegisterResponse
}

export async function submitDocument (apiKey: string, id: string, form: object, headers: { [key: string]: string }): Promise<SubmitDocumentResponse> {
  const options = {
    method: RequestMethods.POST,
    headers
  }
  const response = await request(apiKey, `/api/accounts/${id}/documents`, form, options)
  return response as unknown as SubmitDocumentResponse
}

export async function completeEscrow (apiKey: string, id: string, preimage: SwapPreimage): Promise<void> {
  const data = { preimage: base64ToHex(preimage) }
  await request(apiKey, `/api/escrow/${id}/complete`, data, { method: RequestMethods.POST })
}

// see: https://www.anchorusd.com/docs/api#handle-result
export const ANCHOR_MESSAGE_TYPE = 'customer_info_status'
type AnchorMessageType = 'customer_info_status'

export enum AnchorStatus {
  SUCCESS = 'success',
  PENDING = 'pending',
  DENIED = 'denied'
}

export interface AnchorMessage {
  type: AnchorMessageType,
  status: AnchorStatus,
  [key: string]: AnchorMessageType | AnchorStatus
}

export function isAnchorMessage (message: UnknownObject): message is AnchorMessage {
  if (message.type !== ANCHOR_MESSAGE_TYPE) {
    return false
  }

  if (message.status === AnchorStatus.SUCCESS ||
      message.status === AnchorStatus.PENDING ||
      message.status === AnchorStatus.DENIED) {
    return true
  }

  return false
}

export const ANCHOR_PARTIAL_UNEXPECTED_ERROR = 'An unexpected error occurred'

export const ANCHOR_DASHBOARD_PATH = '/dashboard'
export const ANCHOR_DEPOSIT_PATH = '/dashboard/purchase'
export const ANCHOR_PHOTO_ID_PATH = '/register/image'
