import { createHash } from 'crypto'
import { SwapHash, SwapPreimage } from './types'

export function fail (error: Error): void {
  console.error(error)
  process.exit(1)
}

export function btoa (str: string): string {
  return Buffer.from(str.toString(), 'binary').toString('base64')
}

// resolves with "true" so that delay can be used in a loop condition that
// delays between each loop: do { ... } while (condition && await delay(ms))
export function delay (ms: number): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(true), ms))
}

export function generateHash (preimage: SwapPreimage): SwapHash {
  const sha256 = createHash('sha256')
  const preimageBuf = Buffer.from(preimage, 'base64')
  return sha256.update(preimageBuf).digest('base64')
}

export function sum (arr: number[]): number {
  return arr.reduce((acc, num) => acc + num, 0)
}
