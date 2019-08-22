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
import { AnchorEngine } from '../global-shared/anchor-engine'
import { FWD_DELTA } from '../global-shared/time-locks'
import { Asset } from '../global-shared/types'
import { delay } from '../global-shared/util'
import allSettled, { PromiseResult, PromiseStatus } from '../global-shared/all-settled'
import * as server from './server'
import { Quote, Trade, TradeFailureReason } from '../common/types'
import { logger } from '../common/utils'

// Milliseconds after we start executing a swap that we will still
// accept an inbound HTLC for it.
const SWAP_TIMEOUT = 5000

// Milliseconds between retries of trades that fail during prepareSwap.
// This is a rare edge case, but not one we want to completely ignore.
// 10 minutes.
const RETRY_DELAY = 600000

type Engine = LndEngine | AnchorEngine

interface Engines {
  BTC: LndEngine,
  USDX: AnchorEngine,
  [symbol: string]: Engine
}

function getMaxTimeForTrade (trade: Trade): Date {
  return new Date(trade.startTime.getTime() + SWAP_TIMEOUT)
}

function prepareSwapForTrade (engine: LndEngine, trade: Trade): Promise<void> {
  return prepareSwap(
    trade.hash,
    engine,
    trade.destinationAmount.value.toString(),
    getMaxTimeForTrade(trade)
  )
}

async function resolveTrade (db: Database, engines: Engines, trade: Trade): Promise<void> {
  const {
    id: tradeId,
    hash,
    sourceAmount
  } = trade

  let serverAddress = ''

  try {
    const sourceAddress = await engines.USDX.getPaymentChannelNetworkAddress()
    const destinationAddress = await engines.BTC.getPaymentChannelNetworkAddress()
    await server.execute(hash, sourceAddress, destinationAddress)
    serverAddress = (await server.getServerAddress(sourceAmount.asset)).address
  } catch (e) {
    logger.error(`Error while executing Trade ID ${tradeId} ` +
      `with Hash ${hash} on Server`, { error: e.message })
    failTrade(db, tradeId, TradeFailureReason.SERVER_EXECUTE_ERROR)
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
      `with Hash ${hash}`, { error: e.message })
    failTrade(db, tradeId, TradeFailureReason.PERMANENT_FORWARD_ERROR)
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
    await prepareSwapForTrade(engines.BTC, trade)
  } catch (e) {
    logger.error(`Error while preparing swap for Trade ID ${tradeId} ` +
      `with Hash ${hash}`, { error: e.message })
    failTrade(db, tradeId, TradeFailureReason.PREPARE_SWAP_ERROR)
    throw e
  }

  await resolveTrade(db, engines, trade)
}

async function retryPendingTrade (db: Database, engines: Engines, trade: Trade): Promise<void> {
  try {
    await prepareSwapForTrade(engines.BTC, trade)
  } catch (e) {
    logger.error(`Error while preparing swap for Trade ID ${trade.id} ` +
      `with Hash ${trade.hash}`, { error: e.message })

    if (Date.now() - trade.startTime.getTime() > FWD_DELTA) {
      logger.error(`IMPORTANT: Swap forward time has expired for Trade ID ${trade.id} ` +
        `with Hash ${trade.hash}. Marking as failed without resolution.`)
      failTrade(db, trade.id, TradeFailureReason.PREPARE_SWAP_ERROR)
      throw e
    }

    logger.debug(`Retrying Trade ID ${trade.id} in ${RETRY_DELAY}ms`)
    await delay(RETRY_DELAY)
    return retryPendingTrade(db, engines, trade)
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
