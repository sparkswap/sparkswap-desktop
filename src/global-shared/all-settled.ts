/**
 * This is based on the Promise.allSettled proposal
 * https://github.com/tc39/proposal-promise-allSettled
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
 */

export enum PromiseStatus {
  fulfilled = 'fulfilled',
  rejected = 'rejected'
}

export interface FulfilledPromiseResult {
  status: PromiseStatus.fulfilled,
  value: unknown
}

export interface RejectedPromiseResult {
  status: PromiseStatus.rejected,
  reason: Error
}

export type PromiseResult = FulfilledPromiseResult | RejectedPromiseResult

async function reflect (promise: Promise<unknown>): Promise<PromiseResult> {
  try {
    const value = await promise
    return {
      status: PromiseStatus.fulfilled,
      value
    }
  } catch (e) {
    return {
      status: PromiseStatus.rejected,
      reason: e
    }
  }
}

export default async function allSettled (promises: Array<Promise<unknown>>): Promise<PromiseResult[]> {
  const results = await Promise.all(promises.map(reflect))
  return results
}
