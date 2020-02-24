import {
  parseNetworkAddress,
  serializeNetworkAddress
} from '../../util'
import {
  PaymentChannelNetworkAddress
} from '../../types'

const NETWORK_TYPE = 'bolt'

interface ParsedAddress {
  publicKey: string,
  host?: string
}

export function parse (
  paymentChannelNetworkAddress: PaymentChannelNetworkAddress): ParsedAddress {
  const {
    network,
    id,
    host
  } = parseNetworkAddress(paymentChannelNetworkAddress)

  if (network !== NETWORK_TYPE) {
    throw new Error(`Unable to parse address for ` +
      `payment channel network type of '${NETWORK_TYPE}'`)
  }

  return {
    publicKey: id,
    host
  }
}

export function serialize (publicKey: string, host?: string): PaymentChannelNetworkAddress {
  return serializeNetworkAddress(NETWORK_TYPE, publicKey, host)
}
