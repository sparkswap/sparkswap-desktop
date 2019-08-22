import { app } from 'electron'
import * as path from 'path'
import Database from 'better-sqlite3'
import migrate from './migrate'
import { version } from './migrations'

const DB_NAME = 'sparkswap-data.sqlite'

function open (): Database.Database {
  const dbPath = path.join(app.getPath('userData'), DB_NAME)

  return new Database(dbPath)
}

function setSessionSettings (db: Database.Database): void {
  db.pragma('foreign_keys = ON')
}

function initialize (): Database.Database {
  const db = open()
  setSessionSettings(db)
  migrate(db, version)
  return db
}

function close (db: Database.Database): void {
  db.close()
}

export {
  initialize,
  close
}
