import { Auth, Amount, Asset, URL, UnknownObject } from '../../global-shared/types'
import { Quote, Trade, TradeStatus } from '../../common/types'
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

function deserializeTrade (wireTrade: UnknownObject): Trade {
  return {
    id: wireTrade.id as number,
    status: wireTrade.status as TradeStatus,
    hash: wireTrade.hash as string,
    destinationAmount: wireTrade.destinationAmount as Amount,
    sourceAmount: wireTrade.sourceAmount as Amount,
    startTime: new Date(wireTrade.startTime as string),
    endTime: wireTrade.endTime ? new Date(wireTrade.endTime as string) : undefined
  }
}

export async function getTrades (): Promise<Trade[]> {
  return (await mainRequest('trade:getTrades') as UnknownObject[]).map(deserializeTrade)
}

export async function startDeposit (): Promise<URL> {
  return await mainRequest('anchor:startDeposit') as URL
}

export async function getBalance (asset: Asset): Promise<Amount> {
  return await mainRequest('getBalance', asset) as Amount
}

export function getWebviewPreloadPath (): string {
  return mainRequestSync('getWebviewPreloadPath') as string
}

export default mainRequest
