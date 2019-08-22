import * as crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../common/utils'
import { Auth } from '../common/types'
import { addConfig, getConfig } from './config'

let auth: Auth | null = null

export async function getAuth (): Promise<Auth> {
  if (auth) {
    return auth
  }
  const config = await getConfig()
  if (config.auth.uuid) {
    auth = config.auth
    return auth
  }
  const uuid = uuidv4()
  const apiKey = crypto.randomBytes(16).toString('hex')
  auth = { uuid, apiKey }
  logger.debug('Generated new UUID and API KEY')
  addConfig('auth', auth)
  logger.debug('Saved new UUID and API KEY to configuration file')
  return auth
}
