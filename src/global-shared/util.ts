import { createHash } from 'crypto'
import { SwapHash, SwapPreimage } from './types'

export function btoa (str: string): string {
  return Buffer.from(str.toString(), 'binary').toString('base64')
}

export function delay (ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateHash (preimage: SwapPreimage): SwapHash {
  const sha256 = createHash('sha256')
  const preimageBuf = Buffer.from(preimage, 'base64')
  return sha256.update(preimageBuf).digest('base64')
}
