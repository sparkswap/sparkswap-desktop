import { readFileSync } from 'fs'
import Database from 'better-sqlite3'
import { migrationFilePaths } from './migrations'
import logger from '../../global-shared/logger'

function getVersion (db: Database.Database): number {
  // sqlite3 automatically sets this to 0 on its first start,
  // and any further modifications must come from the user.
  return db.pragma('user_version', { simple: true })
}

function setVersion (db: Database.Database, version: number): void {
  db.pragma(`user_version = ${version}`)
}

function migrate (db: Database.Database, toVersion: number): void {
  const runMigration = db.transaction((migration: string, nextVersion: number) => {
    db.exec(migration)
    setVersion(db, nextVersion)
  })

  for (let dbVersion = getVersion(db); dbVersion < toVersion; dbVersion = getVersion(db)) {
    const nextVersion = dbVersion + 1
    logger.debug(`Database is on version ${dbVersion}, migrating to ${nextVersion}`)

    // to migrate to version n from version n-1, we need the n-1 migration
    const migrationIndex = nextVersion - 1
    const migrationFilePath = migrationFilePaths[migrationIndex]

    if (!migrationFilePath) {
      throw new Error(`No migration exists for version ${nextVersion}`)
    }

    const migration = readFileSync(migrationFilePath, 'utf8')

    runMigration(migration, nextVersion)
  }

  logger.debug(`Database migration completed at version ${toVersion}`)
}

export default migrate
