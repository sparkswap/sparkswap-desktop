import mainRequest, { mainRequestSync } from './main-request'
import {
  ConnectionConfig,
  Statuses
} from '../../global-shared/types/lnd'
import { LndConfig } from '../../common/types'

export async function connect ({ hostName, port, tlsCertPath, macaroonPath }: ConnectionConfig): Promise<void> {
  await mainRequest('lnd:connect', { hostName, port, tlsCertPath, macaroonPath })
}

export async function getStatus (): Promise<Statuses> {
  const status = await mainRequest('lnd:getStatus')
  return status as Statuses
}

export function getConnectionConfig (): LndConfig {
  const connectionConfig = mainRequestSync('lnd:getConnectionConfig')
  return connectionConfig as LndConfig
}

export async function getPaymentChannelNetworkAddress (): Promise<string> {
  const paymentChannelNetworkAddress = await mainRequest('lnd:getPaymentChannelNetworkAddress')
  return paymentChannelNetworkAddress as string
}

export async function scan (): Promise<Statuses> {
  const status = await mainRequest('lnd:scan')
  return status as Statuses
}

export {
  Statuses
}
