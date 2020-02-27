import {
  Auth,
  Asset,
  URL,
  Transaction,
  Channel,
  EngineBalances
} from '../../global-shared/types'
import {
  Quote,
  Trade,
  WireTrade,
  RecurringBuy,
  AlertEvent,
  UnsavedRecurringBuy,
  WireRecurringBuy,
  WireTransaction,
  RequestChannelStatus
} from '../../common/types'
import {
  serializeUnsavedRecurringBuyToWire,
  deserializeRecurringBuyFromWire,
  deserializeTradeFromWire,
  deserializeTransactionFromWire
} from '../../common/serializers'
import { ipcRenderer } from '../electron'

let counter = 1

function genId (): number {
  return counter++
}

interface EventResponse {
  error: string,
  response: string
}

function mainRequest (name: string, payload = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = genId()
    ipcRenderer.once(`${name}:${id}`, (_: Event, eventResponse: EventResponse) => {
      const { error, response } = eventResponse
      if (error != null) {
        return reject(new Error(error))
      } else {
        return resolve(response)
      }
    })

    ipcRenderer.send(name, { id, payload })
  })
}

export function mainRequestSync (name: string, payload = {}): unknown {
  const { error, response } = ipcRenderer.sendSync(name, { payload })
  if (error != null) {
    throw new Error(error)
  }
  return response
}

export async function getAuth (): Promise<Auth> {
  return (await mainRequest('auth:getAuth') as Auth)
}

export async function openLinkInBrowser (link: URL): Promise<void> {
  return (await mainRequest('openLink', { link }) as void)
}

export async function sendExecuteTrade (quote: Quote): Promise<void> {
  await mainRequest('trade:execute', quote)
}

export async function getTrades (limit: number, olderThanTradeId?: number): Promise<Trade[]> {
  return (await mainRequest('trade:getTrades', { limit, olderThanTradeId }) as WireTrade[]).map(deserializeTradeFromWire)
}

export async function getTrade (id: number): Promise<Trade> {
  return deserializeTradeFromWire(await mainRequest('trade:getTrade', { id }) as WireTrade)
}

export async function startDeposit (): Promise<URL> {
  return await mainRequest('anchor:startDeposit') as URL
}

export async function getBalances (asset: Asset): Promise<EngineBalances> {
  return await mainRequest('getBalances', asset) as EngineBalances
}

export function getWebviewPreloadPath (): string {
  return mainRequestSync('getWebviewPreloadPath') as string
}

type paymentUriHandler = (message: { paymentRequest: string }) => void

export function handleLightningPaymentUri (fn: paymentUriHandler): void {
  ipcRenderer.on('lightningPaymentUri', (_event, message): void => {
    fn(message)
  })
}

export async function hasShownProofOfKeys (): Promise<boolean> {
  return await mainRequest('pok:hasShown') as boolean
}

export async function markProofOfKeysShown (): Promise<void> {
  await mainRequest('pok:markShown')
}

export async function getRecurringBuys (): Promise<RecurringBuy[]> {
  return (await mainRequest('dca:getRecurringBuys') as WireRecurringBuy[]).map(deserializeRecurringBuyFromWire)
}

export async function addRecurringBuy (recurringBuy: UnsavedRecurringBuy): Promise<void> {
  await mainRequest('dca:addRecurringBuy', serializeUnsavedRecurringBuyToWire(recurringBuy))
}

export async function removeRecurringBuy (id: number): Promise<void> {
  await mainRequest('dca:removeRecurringBuy', id)
}

export function sendAppNotification (event: AlertEvent): void {
  mainRequestSync('app:notification', event)
}

export async function exportTransactions (): Promise<boolean> {
  return await mainRequest('report:transactions') as boolean
}

export async function getTransactions (asset: Asset): Promise<Transaction[]> {
  return (await mainRequest('getTransactions', asset) as WireTransaction[]).map(deserializeTransactionFromWire)
}

export async function getChannels (): Promise<Channel[]> {
  return await mainRequest('lnd:getChannels') as Channel[]
}

export async function getLNAlias (pubKey: string): Promise<string> {
  return await mainRequest('lnd:getAlias', pubKey) as string
}

export async function closeChannel (channelPoint: string, force: boolean): Promise<void> {
  await mainRequest('lnd:closeChannel', { channelPoint, force })
}

export async function requestChannel (): Promise<RequestChannelStatus> {
  return await mainRequest('requestChannel') as RequestChannelStatus
}

export default mainRequest
