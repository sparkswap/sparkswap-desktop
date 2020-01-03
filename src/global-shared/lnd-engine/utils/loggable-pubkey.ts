import { Nullable } from '../../types'

export function loggablePubKey (pubkey: Nullable<string>): Nullable<string> {
  return pubkey ? `${pubkey.slice(0, 15)}...` : null
}
