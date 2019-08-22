import { Amount, Asset, URL } from '../../global-shared/types'
import { Auth, Quote, Trade } from '../../common/types'
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

export async function getTrades (lastUpdate: Date): Promise<Trade[]> {
  // eslint-disable-next-line
  return (await mainRequest('trade:getTrades', lastUpdate.getTime()) as any).map((trade: any) => {
    trade.startTime = new Date(trade.startTime)
    trade.endTime = trade.endTime ? new Date(trade.endTime) : undefined

    return trade as Trade
  })
}

export async function startDeposit (): Promise<URL> {
  return await mainRequest('anchor:startDeposit') as URL
}

export async function getBalance (asset: Asset): Promise<Amount> {
  return await mainRequest('getBalance', asset) as Amount
}

export default mainRequest
