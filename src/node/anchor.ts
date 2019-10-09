import { addConfig, getConfig } from './config'
import logger from '../global-shared/logger'
import { URL } from '../global-shared/types'
import * as server from './server'
import * as anchor from '../global-shared/anchor-engine/api'
import { AnchorEngine } from '../global-shared/anchor-engine'
import { IS_PRODUCTION } from '../common/config'

// Public API key for the platform
const PLATFORM_API_KEY = IS_PRODUCTION ? 'pk_kAerU8q99D1W8GgHtPxHHc' : 'pk_bGuxdNPqqmYqt6xCDaWaAz'

export class AnchorClient {
  private _apiKey?: string
  private _email?: string
  private _engine?: AnchorEngine

  validated: boolean
  onValidated: () => void

  constructor ({ onValidated }: { onValidated: () => void }) {
    this.validated = false
    this.onValidated = onValidated
    this.initialize()
  }

  get engine (): AnchorEngine {
    if (!this._engine) {
      throw new Error('Anchor engine is unavailable')
    }
    return this._engine
  }

  initialize (): void {
    const config = getConfig()
    if (config.anchor.apiKey) {
      this._apiKey = config.anchor.apiKey
      this._engine = new AnchorEngine(this._apiKey, { logger })
      logger.debug('AnchorEngine validated')
      this.validated = this.engine.validated
      this.onValidated()
    }
    if (config.anchor.email) {
      this._email = config.anchor.email
    }
  }

  isConfigured (): boolean {
    return Boolean(this._apiKey)
  }

  private async getEmail (): Promise<string | null> {
    if (this._email) return this._email

    const email = await server.getEmail()
    if (email) {
      this._email = email
      addConfig('anchor', { email })
      return email
    }

    return null
  }

  async startDeposit (): Promise<URL> {
    const email = await this.getEmail()
    if (!email) {
      throw new Error('Email address not found')
    }

    if (this._apiKey) {
      return (await anchor.createDepositIntent(this._apiKey, email)).url
    }

    const depositResponse = await anchor.createDepositIntent(PLATFORM_API_KEY, email)

    const { url } = await server.submitKYC(depositResponse.identifier)
    addConfig('anchor', { apiKey: depositResponse.api_key })
    await this.initialize()
    return url
  }
}
