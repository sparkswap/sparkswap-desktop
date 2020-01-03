const DELIMITER = ':'
const NETWORK_TYPE = 'bolt'

interface ParsedAddress {
  publicKey: string,
  host?: string
}

export function parse (paymentChannelNetworkAddress: string): ParsedAddress {
  const [networkType, networkAddress] = paymentChannelNetworkAddress.split(DELIMITER, 2)
  if (networkType !== NETWORK_TYPE) {
    throw new Error(`Unable to parse address for payment channel network type of '${networkType}'`)
  }

  const [publicKey, host] = networkAddress.split('@', 2)
  return { publicKey, host }
}
