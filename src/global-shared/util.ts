import { createHash } from 'crypto'
import { SwapHash, SwapPreimage } from './types'
import { Interface } from 'readline'

export function requireEnv (name: string, defaultVal?: string): string | never {
  const value = process.env[name]
  if (value !== undefined) {
    return value
  }
  if (defaultVal !== undefined) {
    return defaultVal
  }
  throw new Error(`Error: must set ${name} environment variable`)
}

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

export function sum (nums: Iterable<number>): number {
  let total = 0
  for (const num of nums) {
    total += num
  }
  return total
}

export function getNthFromMap<K, T> (map: Map<K, T>, n: number): [K, T] {
  return Array.from(map.entries())[n]
}

type StringKeyOf<T> = Extract<keyof T, string>

// like `Object.keys()`, but the type of the response is the union of the
// enum's keys, rather than just `string`. This allows it to be used again
// as an enum key without casting, e.g.:
// ```
// enum Example {
//   testKey = 'TEST'
// }
// const keys = Object.keys(Example)
// console.log(Example[keys[0]]) // prints `TEST` without a typeerror
// ```
export function enumStringKeys<T extends Record<string, unknown>> (obj: T):
Array<StringKeyOf<T>> {
  const propertyIsEnumerable = Object.prototype.propertyIsEnumerable
  return Object.getOwnPropertyNames(obj).filter((key) => {
    return propertyIsEnumerable.call(obj, key) && typeof key === 'string'
  }) as Array<StringKeyOf<T>>
}

// Typeguard for strings as keys of a provided enum
export function isEnumKey<T extends Record<string, unknown>> (obj: T,
  str: string): str is StringKeyOf<T> {
  const keys = enumStringKeys(obj) as string[]
  if (keys.includes(str)) {
    return true
  }

  return false
}

export function question (rl: Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer)
    })
  })
}
