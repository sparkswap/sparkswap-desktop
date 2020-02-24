import { Database } from 'better-sqlite3'
import {
  SwapHash,
  SwapPreimage,
  Asset,
  Unit
} from '../../global-shared/types'
import { valueToEnum } from '../../global-shared/util'
import { Quote, Trade, TradeStatus, TradeFailureReason } from '../../common/types'
import { EventEmitter } from 'events'

export const updater = new EventEmitter()

interface DbTrade {
  id?: number,
  hash: string,
  destinationAmountAsset: string,
  destinationAmountUnit: string,
  destinationAmountValue: number,
  sourceAmountAsset: string,
  sourceAmountUnit: string,
  sourceAmountValue: number,
  expiration: string,
  startTime: string,
  endTime?: string,
  preimage?: string,
  failureCode?: TradeFailureReason
}

function serializeQuote (quote: Quote): Omit<DbTrade, 'startTime'> {
  const {
    hash,
    destinationAmount,
    sourceAmount,
    expiration
  } = quote

  return {
    hash,
    destinationAmountAsset: destinationAmount.asset,
    destinationAmountUnit: destinationAmount.unit,
    destinationAmountValue: destinationAmount.value,
    sourceAmountAsset: sourceAmount.asset,
    sourceAmountUnit: sourceAmount.unit,
    sourceAmountValue: sourceAmount.value,
    expiration: expiration.toISOString()
  }
}

function getTradeStatus (dbTrade: DbTrade): TradeStatus {
  if (!dbTrade.endTime) return TradeStatus.PENDING
  if (dbTrade.preimage) return TradeStatus.COMPLETE
  if (dbTrade.failureCode) return TradeStatus.FAILED

  return TradeStatus.UNKNOWN
}

function deserializeTrade (dbTrade: DbTrade): Trade {
  const {
    id,
    hash,
    destinationAmountAsset,
    destinationAmountUnit,
    destinationAmountValue,
    sourceAmountAsset,
    sourceAmountUnit,
    sourceAmountValue,
    expiration,
    startTime,
    endTime,
    preimage,
    failureCode
  } = dbTrade

  if (!startTime) throw new Error('Cannot deserialize trade without startTime')
  if (!id) throw new Error('Cannot deserialize trade without id')

  return {
    id,
    hash,
    destinationAmount: {
      asset: valueToEnum(Asset, destinationAmountAsset),
      unit: valueToEnum(Unit, destinationAmountUnit),
      value: destinationAmountValue
    },
    sourceAmount: {
      asset: valueToEnum(Asset, sourceAmountAsset),
      unit: valueToEnum(Unit, sourceAmountUnit),
      value: sourceAmountValue
    },
    expiration: new Date(expiration),
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : undefined,
    preimage,
    failureCode,
    status: getTradeStatus(dbTrade)
  }
}

export function addTrade (db: Database, quote: Quote): number {
  // TODO: use an AssetUnit pair when inserting to enforce the validity
  // of a given pair at the database level
  if (quote.destinationAmount.asset !== Asset.BTC || quote.destinationAmount.unit !== Unit.Satoshi) {
    throw new Error('Only BTC amounts in satoshis are allowed as trade destinations.')
  }
  if (quote.sourceAmount.asset !== Asset.USDX || quote.sourceAmount.unit !== Unit.Cent) {
    throw new Error('Only USDX amounts in cents are allowed as trade sources.')
  }

  // Initialize the startTime in JS instead of the db process
  const dbTrade = Object.assign({}, serializeQuote(quote), { startTime: new Date().toISOString() })

  const statement = db.prepare(`
INSERT INTO trades (
  hash,
  destinationAmountAsset,
  destinationAmountUnit,
  destinationAmountValue,
  sourceAmountAsset,
  sourceAmountUnit,
  sourceAmountValue,
  expiration,
  startTime
) VALUES (
  @hash,
  @destinationAmountAsset,
  @destinationAmountUnit,
  @destinationAmountValue,
  @sourceAmountAsset,
  @sourceAmountUnit,
  @sourceAmountValue,
  @expiration,
  @startTime
)
  `)

  const id = Number(statement.run(dbTrade).lastInsertRowid)

  updater.emit('insert', id)

  return id
}

export function completeTrade (db: Database, id: number, hash: SwapHash, preimage: SwapPreimage): void {
  const statement = db.prepare(`
UPDATE trades
SET endTime = @endTime, preimage = @preimage
WHERE id = @id AND hash = @hash
  `)

  statement.run({ id, hash, preimage, endTime: new Date().toISOString() })

  updater.emit('update', id)
}

export function failTrade (db: Database, id: number, reason: TradeFailureReason): void {
  const statement = db.prepare(`
UPDATE trades
SET endTime = @endTime, failureCode = @reason
WHERE id = @id
  `)

  statement.run({ id, reason, endTime: new Date().toISOString() })

  updater.emit('update', id)
}

export function getTrades (db: Database, olderThanTradeId = Number.MAX_SAFE_INTEGER, limit = 100): Trade[] {
  const statement = db.prepare(`
SELECT
  id,
  hash,
  destinationAmountAsset,
  destinationAmountUnit,
  destinationAmountValue,
  sourceAmountAsset,
  sourceAmountUnit,
  sourceAmountValue,
  expiration,
  startTime,
  endTime,
  preimage,
  failureCode
FROM trades
WHERE id < @olderThanTradeId
ORDER BY id DESC
LIMIT @limit
  `)

  const dbTrades = statement.all({ olderThanTradeId, limit })
  return dbTrades.map(deserializeTrade)
}

export function getTrade (db: Database, id: number): Trade {
  const statement = db.prepare(`
SELECT
  id,
  hash,
  destinationAmountAsset,
  destinationAmountUnit,
  destinationAmountValue,
  sourceAmountAsset,
  sourceAmountUnit,
  sourceAmountValue,
  expiration,
  startTime,
  endTime,
  preimage,
  failureCode
FROM trades
WHERE id = @id
  `)

  return deserializeTrade(statement.get({ id }))
}

export function getPendingTrades (db: Database): Trade[] {
  const statement = db.prepare(`
SELECT
  id,
  hash,
  destinationAmountAsset,
  destinationAmountUnit,
  destinationAmountValue,
  sourceAmountAsset,
  sourceAmountUnit,
  sourceAmountValue,
  expiration,
  startTime
FROM trades
WHERE endTime IS NULL
  `)

  return statement.all().map(deserializeTrade)
}

function triggerChange (tradeId: number): void {
  updater.emit('change', tradeId)
}

updater.on('insert', triggerChange)
updater.on('update', triggerChange)
