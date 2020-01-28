import logger from '../global-shared/logger'
import { delay } from '../global-shared/util'
import { cancelSwapWithRetry } from '../global-shared/retry'
import { Engine, SwapHash, SwapPreimage } from '../global-shared/types'
import { innerTimeLock, outerTimeLock } from '../global-shared/time-locks'
import { getEngineErrors } from '../global-shared/errors'

interface Payment {
  engine: Engine,
  amount: string,
  address: string
}

/**
 * Number of milliseconds between each attempt to resolve a translation across
 * chains. This happens when we encounter a temporary error. We need to keep
 * retrying so as to not end up in a non-atomic state, but if we retry too
 * frequently we could continually flap. This delay ensures we stay atomic,
 * but without needlessly looping over the same error.
 */
const RETRY_DELAY = 30000

/**
 * Prepare for a swap by setting up a hold invoice
 * on the inbound chain.
 */
async function prepareSwap (hash: SwapHash, inboundEngine: Engine,
  outboundEngine: Engine, amount: string, timeout: Date): Promise<void> {
  // we use a swap `duration` of 0, since we will translate the swap as though
  // it was received exactly at expiration. This allows us to be more lenient
  // with inbound swaps we will accept without the risk that we will be left
  // non-atomic.
  const { receive: inboundTimeLock } = outerTimeLock(outboundEngine, inboundEngine, 0)
  await inboundEngine.prepareSwap(
    hash,
    amount,
    timeout,
    inboundTimeLock
  )
}

/**
 * Translate a swap payment to the other chain in an idempotent fashion,
 * i.e. by only paying the downstream invoice if it is not available any
 * other way. This is done by retrieving the preimage:
 * - from an existing outbound payment
 * - from an existing settled inbound invoice
 * - by making a new outbound payment
 */
async function translateIdempotent (
  hash: SwapHash,
  inboundEngine: Engine,
  { engine: outboundEngine, amount: outboundAmount, address: outboundAddress }: Payment,
  expiration: Date
): Promise<SwapPreimage> {
  try {
    await inboundEngine.waitForSwapCommitment(hash, expiration)
  } catch (e) {
    if (e instanceof getEngineErrors(inboundEngine).SettledSwapError) {
      logger.debug(`Swap for ${hash} has already been settled`)

      return inboundEngine.getSettledSwapPreimage(hash)
    }

    throw e
  }

  const { send: timeLock } = innerTimeLock(outboundEngine)
  const maxTime = new Date(expiration.getTime() + timeLock * 1000)

  logger.debug(`Sending payment to ${outboundAddress} to translate ${hash} ` +
    `maxTime=${maxTime.toISOString()} outboundAmount=${outboundAmount}`)

  return outboundEngine.translateSwap(
    outboundAddress,
    hash,
    outboundAmount,
    maxTime
  )
}

/**
 * Settle an upstream payment for a swap.
 */
async function settleSwap (engine: Engine, hash: SwapHash, preimage: SwapPreimage): Promise<void> {
  logger.debug(`Settling upstream payment for ${hash}`)
  await engine.settleSwap(preimage)
  logger.debug(`Successfully settled upstream payment for ${hash}`)
}

/**
 * Forward a swap cross-chain by retrieving the preimage from the
 * downstream chain (by paying an invoice to its hash) and returning it
 * to the upstream chain, cancelling the upstream when an unrecoverable
 * error is encountered. When any other error is encountered, it retries
 * to protect us against being in a non-atomic state.
 */
async function forwardSwap (hash: SwapHash, inboundEngine: Engine, outboundPayment: Payment, expiration: Date): Promise<SwapPreimage> {
  const inboundErrors = getEngineErrors(inboundEngine)
  const outboundErrors = getEngineErrors(outboundPayment.engine)

  try {
    const paymentPreimage = await translateIdempotent(hash, inboundEngine, outboundPayment, expiration)
    logger.debug(`Successfully retrieved preimage for swap ${hash}`)

    await settleSwap(inboundEngine, hash, paymentPreimage)

    return paymentPreimage
  } catch (e) {
    if (e instanceof outboundErrors.PermanentSwapError) {
      logger.error('Permanent Error encountered while translating swap, ' +
        `cancelling upstream invoice for ${hash}: ${e}`)
      cancelSwapWithRetry(inboundEngine, hash)
      throw e
    }

    if (e instanceof inboundErrors.CanceledSwapError) {
      logger.error(`Swap for ${hash} has been cancelled upstream. ` +
        'We may be in a non-atomic state (if the downstream is still active), ' +
        'or be retrying a cancelled swap.')
      // When an invoice is cancelled upstream, we are either in non-atomic state
      // (which we can do nothing about) or the swap itself has already been cancelled.
      // We treat it as though it is cancelled, throwing an error without retrying,
      // since the non-atomic state is not actionable, and retrying will put us in an
      // infinite loop.
      throw e
    }

    if (e instanceof inboundErrors.ExpiredSwapError) {
      logger.error(`Swap for ${hash} is expired upstream. ` +
        'We may be in a non-atomic state (if the downstream is still active), ' +
        'or be retrying a cancelled swap.')
      // When an invoice is expired upstream, we are either in non-atomic state
      // (which we can do nothing about) or the swap itself has already been cancelled.
      // We treat it as though it is expired, throwing an error without retrying,
      // since the non-atomic state is not actionable, and retrying will put us in an
      // infinite loop.
      throw e
    }

    // A temporary (non-permanent) error means we don't know the current state,
    // so we need to restart the whole process
    logger.error('Temporary Error encountered while forwarding swap with hash ' +
      `${hash}: ${e}`)
    logger.debug(`Delaying swap forward retry for ${hash} for ${RETRY_DELAY}ms`)
    await delay(RETRY_DELAY)
    logger.debug(`Retrying swap forward for ${hash}`)
    return forwardSwap(hash, inboundEngine, outboundPayment, expiration)
  }
}

export {
  prepareSwap,
  forwardSwap
}
