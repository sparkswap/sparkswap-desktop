import { addConfig, getConfig } from './config'
import { URL } from '../global-shared/types'
import * as server from './server'
import * as anchor from '../global-shared/anchor-engine/api'
import { AnchorEngine } from '../global-shared/anchor-engine'

// public API key for the platform
const PLATFORM_API_KEY = process.env.NODE_ENV === 'development'
  ? 'pk_bGuxdNPqqmYqt6xCDaWaAz' : 'TODO'

export class AnchorClient {
  private _apiKey?: string
  private _engine?: AnchorEngine

  constructor () {
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
      this._engine = new AnchorEngine(this._apiKey)
    }
  }

  async startDeposit (): Promise<URL> {
    const email = await server.getEmail()
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
