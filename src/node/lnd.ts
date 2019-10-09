import { existsSync } from 'fs'
import { EventEmitter } from 'events'
import LndEngine from 'lnd-engine'
import logger from '../global-shared/logger'
import { ConnectionConfig, Statuses } from '../global-shared/types/lnd'
import { Asset } from '../global-shared/types'
import { addConfig, getConfig } from './config'
import { getServerAddress } from './server'
import { LndConfig } from '../common/types'
import SCAN_CONFIGS from './lnd-configs'
import { delay } from '../global-shared/util'

const MIN_LND_VERSION = '0.7.1-beta'

const ASSET = Asset.BTC

const CONNECT_TO_SERVER_RETRY_MS = 10000

function saveConfiguredFlag (): void {
  const { lnd } = getConfig()
  if (!lnd.configured) {
    addConfig('lnd', Object.assign(lnd, { configured: true }))
  }
}

class LndClient extends EventEmitter {
  _engine?: LndEngine
  validated: boolean
  onValidated: () => void

  get engine (): LndEngine {
    if (!this._engine) {
      throw new Error(`LND Engine is unavailable`)
    }

    return this._engine
  }

  get status (): Statuses {
    if (!this._engine) {
      return LndEngine.STATUSES.UNKNOWN
    }

    return this._engine.status
  }

  constructor ({ onValidated }: { onValidated: () => void }) {
    super()
    this.connect(this.getConnectionConfig())
    this.validated = false
    this.onValidated = onValidated
  }

  manualConnect ({ hostName, port, tlsCertPath, macaroonPath }: ConnectionConfig): void {
    if (!existsSync(tlsCertPath)) {
      throw new Error('File does not exist at TLS certificate path')
    }

    if (!existsSync(macaroonPath)) {
      throw new Error('File does not exist at macaroon path')
    }

    addConfig('lnd', { hostName, port, tlsCertPath, macaroonPath })

    this.connect(this.getConnectionConfig())
  }

  async getStatus (): Promise<Statuses> {
    if (!this._engine) {
      return LndEngine.STATUSES.UNKNOWN
    }

    const engineStatus = await this._engine.getStatus()
    const validated = engineStatus === LndEngine.STATUSES.VALIDATED
    const becameValidated = !this.validated && validated

    this.validated = validated

    if (becameValidated) {
      logger.debug(`LndEngine validated`)
      saveConfiguredFlag()
      this.connectLNDToServer()
      this.onValidated()
    }

    return engineStatus
  }

  async scan (): Promise<Statuses> {
    for (const config of SCAN_CONFIGS) {
      await this.connect(config)

      // the engine could not even be created
      // (likely due to missing cert file)
      if (!this._engine) continue

      const status = await this.engine.getStatus()
      if (status !== LndEngine.STATUSES.UNAVAILABLE) {
        // only save the config if it was "successful"
        // (meaning we got a response that indicates LND at least exists)
        addConfig('lnd', config)
        return status
      }
    }

    return LndEngine.STATUSES.UNKNOWN
  }

  getConnectionConfig (): LndConfig {
    const { lnd } = getConfig()

    return lnd
  }

  private connect ({ hostName, port, tlsCertPath, macaroonPath }: ConnectionConfig): void {
    this._engine = undefined
    try {
      // the LndEngine constructor will throw if the tlsCert or macaroon do not
      // exist at the specified file locations
      this._engine = new LndEngine(`${hostName}:${port}`, ASSET,
        { tlsCertPath, macaroonPath, minVersion: MIN_LND_VERSION, logger }) as
        LndEngine
      this.engine.getStatus()
    } catch (e) {
      logger.error(`Unable to create engine: ${e}`)
    }
  }

  private async connectLNDToServer (): Promise<void> {
    while (true) {
      try {
        const { address } = await getServerAddress(ASSET)
        await this.engine.connectUser(address)
        logger.debug('Successfully connected LND to server')
        return
      } catch (e) {
        logger.error(`Failed to connect LND to server: ${e}`)
        await delay(CONNECT_TO_SERVER_RETRY_MS)
      }
    }
  }
}

export default LndClient
