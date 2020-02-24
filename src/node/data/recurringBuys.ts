import { Database } from 'better-sqlite3'
import { RecurringBuy, UnsavedRecurringBuy, TimeUnit } from '../../common/types'
import { EventEmitter } from 'events'
import { valueToEnum } from '../../global-shared/util'
import { Asset, Unit } from '../../global-shared/types'

export const updater = new EventEmitter()

interface DbRecurringBuy {
  id: number,
  amountAsset: string,
  amountUnit: string,
  amountValue: number,
  duration: number,
  timeUnit: string,
  referenceTime: string
}

type DbUnsavedRecurringBuy = Omit<DbRecurringBuy, 'id'>

function serializeRecurringBuyToDb (recurringBuy: UnsavedRecurringBuy): DbUnsavedRecurringBuy {
  return {
    amountAsset: recurringBuy.amount.asset,
    amountUnit: recurringBuy.amount.unit,
    amountValue: recurringBuy.amount.value,
    duration: recurringBuy.frequency.interval,
    timeUnit: recurringBuy.frequency.unit,
    referenceTime: recurringBuy.referenceTime.toISOString()
  }
}

function deserializeRecurringBuyFromDb (dbRecurringBuy: DbRecurringBuy): RecurringBuy {
  if (!dbRecurringBuy.id) {
    throw new Error(`Cannot deserialize recurring buy without id`)
  }

  return {
    id: dbRecurringBuy.id,
    amount: {
      asset: valueToEnum(Asset, dbRecurringBuy.amountAsset),
      unit: valueToEnum(Unit, dbRecurringBuy.amountUnit),
      value: dbRecurringBuy.amountValue
    },
    frequency: {
      interval: dbRecurringBuy.duration,
      unit: valueToEnum(TimeUnit, dbRecurringBuy.timeUnit)
    },
    referenceTime: new Date(dbRecurringBuy.referenceTime)
  }
}

export function addRecurringBuy (db: Database, recurringBuy: UnsavedRecurringBuy): number {
  const dbRecurringBuy = serializeRecurringBuyToDb(recurringBuy)

  const statement = db.prepare(`
INSERT INTO recurringBuys (
  amountAsset,
  amountUnit,
  amountValue,
  duration,
  timeUnit,
  referenceTime
) VALUES (
  @amountAsset,
  @amountUnit,
  @amountValue,
  @duration,
  @timeUnit,
  @referenceTime
)
  `)

  const id = Number(statement.run(dbRecurringBuy).lastInsertRowid)

  updater.emit('insert', id)

  return id
}

export function getRecurringBuys (db: Database): RecurringBuy[] {
  const statement = db.prepare(`
SELECT
  id,
  amountAsset,
  amountUnit,
  amountValue,
  duration,
  timeUnit,
  referenceTime
FROM recurringBuys
ORDER BY id DESC
  `)

  const dbRecurringBuys = statement.all()
  return dbRecurringBuys.map(deserializeRecurringBuyFromDb)
}

export function removeRecurringBuy (db: Database, id: number): number {
  const statement = db.prepare(`
DELETE FROM recurringBuys
WHERE id = @id;
  `)

  statement.run({ id })

  updater.emit('delete', id)

  return id
}

function triggerChange (recurringBuyId: number): void {
  updater.emit('change', recurringBuyId)
}

updater.on('insert', triggerChange)
updater.on('delete', triggerChange)
