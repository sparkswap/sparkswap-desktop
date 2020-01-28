import { Engine } from './types'

// For each leg of the swap, we want a buffer between the enforced
// timelock on the receiver side, below which they will reject it,
// and the timelock specified by the sender. If these values are equivalent,
// the payment may be rejected because time passes (or, in the case of Bitcoin, a block is mined)
// between when the payment is initiated by the sender and when it is
// evaluated by the recipient.
export interface TimeLock {
  send: number,
  receive: number
}

// The outer engine is the engine involved in the initial HTLC/escrow, the one that kicks off the swap process.
// The inner engine is the engine involved in the second and final HTLC/escrow, and is the first place in the
// process that the preimage to the shared hash is revealed.
// The swap transaction completes the same place it begins: at the outer engine with the settlement
// of the initial HTLC/escrow.

export function innerTimeLock (innerEngine: Engine): TimeLock {
  const receive = innerEngine.finalHopTimeLock
  // add a buffer to ensure acceptance by the recipient
  const send = receive + innerEngine.blockBuffer

  return {
    send,
    receive
  }
}

export function outerTimeLock (innerEngine: Engine, outerEngine: Engine, swapDuration: number): TimeLock {
  // to enable a swap, the party translating from the origin chain to the destination chain
  // needs enough time to retrieve the preimage from the destination chain, and publish it
  // on the origin chain in the case of a contested close.
  const interchainForwardDelta = innerEngine.retrieveWindowDuration +
    outerEngine.claimWindowDuration + swapDuration

  const receive = innerTimeLock(innerEngine).send + interchainForwardDelta
  // add a buffer to ensure acceptance by the recipient
  const send = receive + outerEngine.blockBuffer

  return {
    send,
    receive
  }
}
