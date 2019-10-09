import { Database } from 'better-sqlite3'
import {
  addTrade,
  completeTrade,
  failTrade,
  getTrade,
  getPendingTrades
} from './data'
import { prepareSwap, forwardSwap } from './interchain'
import LndEngine from 'lnd-engine'
import { AnchorEngine, EscrowStatus } from '../global-shared/anchor-engine'
import { cancelSwapWithRetry } from '../global-shared/retry'
import { Asset, Engine } from '../global-shared/types'
import { delay } from '../global-shared/util'
import allSettled, { PromiseResult, PromiseStatus } from '../global-shared/all-settled'
import * as server from './server'
import { Quote, Trade, TradeFailureReason } from '../common/types'
import { swapTimeLock } from '../global-shared/time-locks'
import logger from '../global-shared/logger'
import { getChannelsState } from './channels'

const { ExpiredSwapError: LndExpiredSwapError } = LndEngine.ERRORS

// Milliseconds after we start executing a swap that we will still
// accept an inbound HTLC for it. We have to be careful that the client's
// invoice expires before the server's invoice expires so that we don't run
// into a situation where the server fails the trade and then the client
// creates an escrow because then the funds will get stuck until the expiration.
const SWAP_TIMEOUT = 5000

// Milliseconds between retries of trades that fail during prepareSwap.
// This is a rare edge case, but not one we want to completely ignore.
// 10 minutes.
const RETRY_DELAY = 600000

interface Engines {
  BTC: LndEngine,
  USDX: AnchorEngine,
  [symbol: string]: Engine
}

function getMaxTimeForTrade (trade: Trade): Date {
  return new Date(trade.startTime.getTime() + SWAP_TIMEOUT)
}

function prepareSwapForTrade (inboundEngine: LndEngine,
  outboundEngine: AnchorEngine, trade: Trade): Promise<void> {
  return prepareSwap(
    trade.hash,
    inboundEngine,
    outboundEngine,
    trade.destinationAmount.value.toString(),
    getMaxTimeForTrade(trade)
  )
}

async function abortTrade (db: Database, engines: Engines, trade: Trade,
  reason: TradeFailureReason): Promise<void> {
  logger.debug(`Marking trade as failed: ${trade.hash}`)
  await failTrade(db, trade.id, reason)

  const escrowStatus = await engines.USDX.getEscrowStatus(trade.hash)
  if (escrowStatus === null || escrowStatus === EscrowStatus.canceled) {
    logger.info(`Canceling inbound BTC invoice with hash ${trade.hash}`)
    cancelSwapWithRetry(engines.BTC, trade.hash)
  } else {
    logger.warn(`Outbound USDX escrow is in status ${escrowStatus}; ` +
      `cannot cancel inbound BTC invoice with hash ${trade.hash}`)
  }
}

async function resolveTrade (db: Database, engines: Engines, trade: Trade): Promise<void> {
  const {
    id: tradeId,
    hash,
    sourceAmount,
    destinationAmount
  } = trade

  let serverAddress = ''

  try {
    const sourceAddress = await engines.USDX.getPaymentChannelNetworkAddress()
    const destinationAddress = await engines.BTC.getPaymentChannelNetworkAddress()
    await server.execute(hash, sourceAddress, destinationAddress)
    serverAddress = (await server.getServerAddress(sourceAmount.asset)).address
  } catch (e) {
    logger.error(`Error while executing Trade ID ${tradeId} ` +
      `with Hash ${hash} on Server: ${e}`)
    abortTrade(db, engines, trade, TradeFailureReason.SERVER_EXECUTE_ERROR)
    throw e
  }

  try {
    const preimage = await forwardSwap(hash, engines.BTC, {
      engine: engines.USDX,
      amount: sourceAmount.value.toString(),
      address: serverAddress
    })

    completeTrade(db, tradeId, hash, preimage)
  } catch (e) {
    logger.error(`Error while forwarding swap for Trade Id ${tradeId} ` +
      `with Hash ${hash}: ${e}`)
    abortTrade(db, engines, trade, TradeFailureReason.PERMANENT_FORWARD_ERROR)

    if (e instanceof LndExpiredSwapError) {
      // ExpiredSwapError will be triggered if a channel is pending open and a user tries a swap
      const { maxRemotePendingOpenBalance, maxRemoteActiveBalance } = await getChannelsState(engines.BTC)

      if (maxRemoteActiveBalance > destinationAmount.value) {
        throw new Error('Trade timed out before completion.')
      }

      if (maxRemotePendingOpenBalance >= destinationAmount.value) {
        throw new Error('Channel with Sparkswap is not yet open. Please wait for the channel to finish opening, then try again.')
      } else {
        throw new Error('No active channels with enough inbound capacity.')
      }
    }
    throw e
  }
}

export async function executeTrade (db: Database, engines: Engines, quote: Quote): Promise<void> {
  const {
    hash,
    sourceAmount,
    destinationAmount
  } = quote

  if (destinationAmount.asset !== Asset.BTC) {
    throw new Error('Only swaps receiving BTC are supported.')
  }

  if (sourceAmount.asset !== Asset.USDX) {
    throw new Error('Only swaps sending USDX are supported.')
  }

  const tradeId = addTrade(db, quote)
  const trade = getTrade(db, tradeId)

  try {
    await prepareSwapForTrade(engines.BTC, engines.USDX, trade)
  } catch (e) {
    logger.error(`Error while preparing swap for Trade ID ${tradeId} ` +
      `with Hash ${hash}: ${e}`)
    abortTrade(db, engines, trade, TradeFailureReason.PREPARE_SWAP_ERROR)
    throw e
  }

  await resolveTrade(db, engines, trade)
}

async function retryPendingTrade (db: Database, engines: Engines, trade: Trade): Promise<void> {
  while (true) {
    try {
      await prepareSwapForTrade(engines.BTC, engines.USDX, trade)
      break
    } catch (e) {
      logger.error(`Error while preparing swap for Trade ID ${trade.id} ` +
        `with Hash ${trade.hash}: ${e}`)
    }

    const inboundEngine = engines.BTC
    const outboundEngine = engines.USDX
    const timelocks = swapTimeLock(inboundEngine, outboundEngine)
    const forwardTimeLockDelta =
      timelocks.outerTimeLock.receive - timelocks.innerTimeLock.send
    if (Date.now() - trade.startTime.getTime() > forwardTimeLockDelta) {
      logger.error(`IMPORTANT: Swap forward time has expired for Trade ID ${trade.id} ` +
        `with Hash ${trade.hash}. Marking as failed without resolution.`)
      abortTrade(db, engines, trade, TradeFailureReason.PREPARE_SWAP_ERROR)
      throw new Error(`Swap forward time has expired for trade ${trade.id}`)
    }

    logger.debug(`Retrying Trade ID ${trade.id} in ${RETRY_DELAY}ms`)
    await delay(RETRY_DELAY)
  }

  return resolveTrade(db, engines, trade)
}

export async function retryPendingTrades (db: Database, engines: Engines): Promise<void> {
  const pendingTrades = getPendingTrades(db)

  logger.debug(`Retrying ${pendingTrades.length} pending trades`)

  const results = await allSettled(pendingTrades.map((trade) => {
    return retryPendingTrade(db, engines, trade)
  }))

  results.forEach((result: PromiseResult) => {
    if (result.status === PromiseStatus.rejected) {
      logger.error(`Error while retrying trade: ${result.reason.message}`)
    }
  })

  const fulfilledCount = results.filter(({ status }: PromiseResult) => {
    return status === PromiseStatus.fulfilled
  }).length

  logger.debug(`Retried ${pendingTrades.length} pending trades, ` +
    `with ${fulfilledCount} successful.`)
}
