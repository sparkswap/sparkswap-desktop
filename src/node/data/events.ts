import { Database } from 'better-sqlite3'

const PROOF_OF_KEYS_EVENT = 'shownProofOfKeys'

export function hasShownProofOfKeys (db: Database): boolean {
  const statement = db.prepare(`
    SELECT COUNT(id)
    FROM events
    WHERE type = @eventType
  `)

  return Boolean(statement.pluck().get({ eventType: PROOF_OF_KEYS_EVENT }))
}

export function markProofOfKeysShown (db: Database): void {
  const statement = db.prepare(`
    INSERT INTO events (
      type
    ) VALUES (
      @eventType
    )
  `)

  statement.run({ eventType: PROOF_OF_KEYS_EVENT })
}
