import logger from '../global-shared/logger'
import { delay } from '../global-shared/util'
import { AnchorEngine } from '../global-shared/anchor-engine'
import LndEngine from 'lnd-engine'
import { cancelSwapWithRetry } from '../global-shared/retry'
import { Engine, SwapHash, SwapPreimage } from '../global-shared/types'
import { OUTBOUND_TIME_LOCK, INBOUND_TIME_LOCK } from '../global-shared/time-locks'

const {
  PermanentSwapError: LndPermanentSwapError,
  ExpiredSwapError: LndExpiredSwapError,
  CanceledSwapError: LndCanceledSwapError,
  SettledSwapError: LndSettledSwapError
} = LndEngine.ERRORS

const {
  PermanentSwapError: AnchorPermanentSwapError,
  ExpiredSwapError: AnchorExpiredSwapError,
  CanceledSwapError: AnchorCanceledSwapError,
  SettledSwapError: AnchorSettledSwapError
} = AnchorEngine.ERRORS

interface EngineErrors {
  PermanentSwapError: typeof LndPermanentSwapError | typeof AnchorPermanentSwapError,
  ExpiredSwapError: typeof LndExpiredSwapError | typeof AnchorExpiredSwapError,
  CanceledSwapError: typeof LndCanceledSwapError | typeof AnchorCanceledSwapError,
  SettledSwapError: typeof LndSettledSwapError | typeof AnchorSettledSwapError
}

function getInstanceErrors (engine: Engine): EngineErrors {
  if (engine instanceof LndEngine) {
    return LndEngine.ERRORS
  }
  if (engine instanceof AnchorEngine) {
    return AnchorEngine.ERRORS
  }

  throw new Error('Invalid Engine')
}

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
async function prepareSwap (hash: SwapHash, engine: LndEngine, amount: string, timeout: Date): Promise<void> {
  await engine.prepareSwap(
    hash,
    amount,
    timeout,
    INBOUND_TIME_LOCK
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
  { engine: outboundEngine, amount: outboundAmount, address: outboundAddress }: Payment
): Promise<SwapPreimage> {
  let committedTime

  try {
    committedTime = await inboundEngine.waitForSwapCommitment(hash)
  } catch (e) {
    if (e instanceof getInstanceErrors(inboundEngine).SettledSwapError) {
      logger.debug(`Swap for ${hash} has already been settled`)

      return inboundEngine.getSettledSwapPreimage(hash)
    }

    throw e
  }

  // add our static time lock to the time the inbound contract was accepted
  // to arrive at the latest time that our outbound contract can be
  // resolved while still considering our state "safe" and atomic.
  const maxTime = new Date(committedTime.getTime() + (OUTBOUND_TIME_LOCK * 1000))

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
async function forwardSwap (hash: SwapHash, inboundEngine: Engine, outboundPayment: Payment): Promise<SwapPreimage> {
  const inboundErrors = getInstanceErrors(inboundEngine)
  const outboundErrors = getInstanceErrors(outboundPayment.engine)

  try {
    const paymentPreimage = await translateIdempotent(hash, inboundEngine, outboundPayment)
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
    return forwardSwap(hash, inboundEngine, outboundPayment)
  }
}

export {
  prepareSwap,
  forwardSwap
}
