export { parse, serialize } from './network-address-formatter'
export { loggablePubKey } from './loggable-pubkey'
export { getChanReserves } from './get-chan-reserves'
export * from './typeguards'

// LND (and bitcoin) use 'internal byte order' when encoding a txid into bytes.
// This requires us to reverse the bytes of any byte value txid to get the 'correct'
// txid string
export function txidBytesToTxid (txid: string): string {
  return Buffer.from(txid, 'base64').reverse().toString('hex')
}
