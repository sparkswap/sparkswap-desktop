import { EventEmitter } from 'events'
import LndEngine from 'lnd-engine'
import { ConnectionConfig, Statuses } from '../global-shared/types/lnd'
import { Asset } from '../global-shared/types'
import { addConfig, getConfig } from './config'
import { getServerAddress } from './server'
import { LndConfig } from '../common/types'
import SCAN_CONFIGS from './lnd-configs'
import { delay } from '../global-shared/util'

const MIN_LND_VERSION = '0.7.0-beta'

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

  constructor () {
    super()
    this.on('connect', () => saveConfiguredFlag())
    this.on('connect', () => this.connectToServer())
    this.connect(this.getConnectionConfig())
  }

  manualConnect ({ hostName, port, tlsCertPath, macaroonPath }: ConnectionConfig): void {
    addConfig('lnd', { hostName, port, tlsCertPath, macaroonPath })

    this.connect(this.getConnectionConfig())
  }

  async getStatus (): Promise<Statuses> {
    if (!this._engine) {
      return LndEngine.STATUSES.UNKNOWN
    }

    return this._engine.getStatus()
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
      // the LndEngine constructor will throw if the tlsCert or macaroon do not exist at the
      // specified file locations
      this._engine = new LndEngine(`${hostName}:${port}`, ASSET,
        { tlsCertPath, macaroonPath, minVersion: MIN_LND_VERSION }) as LndEngine
      this.engine.validateEngine().then(() => this.emit('connect'))
    } catch (e) {
      console.error(`Unable to create engine`, e)
    }
  }

  private async connectToServer (): Promise<void> {
    while (true) {
      try {
        const { address } = await getServerAddress(ASSET)
        await this.engine.connectUser(address)
        console.debug('Successfully connected to server')
        return
      } catch (e) {
        console.error(`Failed to connect to server: ${e.message}`)
        await delay(CONNECT_TO_SERVER_RETRY_MS)
      }
    }
  }
}

export default LndClient
