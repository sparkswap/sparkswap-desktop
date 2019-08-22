import * as path from 'path'
import { app } from 'electron'
import { ConnectionConfig } from '../global-shared/types/lnd'

// Node Launcher also uses the default config
const LND_DEFAULT_CONFIG: ConnectionConfig = {
  hostName: 'localhost',
  port: 11008,
  tlsCertPath: path.join(
    app.getPath('appData'),
    'lnd',
    'tls.cert'
  ),
  macaroonPath: path.join(
    app.getPath('appData'),
    'lnd',
    'data',
    'chain',
    'bitcoin',
    'mainnet',
    'admin.macaroon'
  )
}

// Zap can create multiple wallets
const ZAP_CONFIGS: ConnectionConfig[] = [1, 2, 3, 4, 5].map(num => {
  return {
    hostName: 'localhost',
    port: 11009,
    tlsCertPath: path.join(
      app.getPath('appData'),
      'Zap',
      'lnd',
      'bitcoin',
      'mainnet',
      `wallet-${num}`,
      'tls.cert'
    ),
    macaroonPath: path.join(
      app.getPath('appData'),
      'Zap',
      'lnd',
      'bitcoin',
      'mainnet',
      `wallet-${num}`,
      'data',
      'chain',
      'bitcoin',
      'mainnet',
      'admin.macaroon'
    )
  }
})

const LN_APP_CONFIG: ConnectionConfig = {
  hostName: 'localhost',
  port: 10006,
  tlsCertPath: path.join(
    app.getPath('appData'),
    'lightning-app',
    'lnd',
    'tls.cert'
  ),
  macaroonPath: path.join(
    app.getPath('appData'),
    'lightning-app',
    'lnd',
    'data',
    'chain',
    'bitcoin',
    'mainnet',
    'admin.macaroon'
  )
}

const LND_CONFIGS: ConnectionConfig[] = [
  LND_DEFAULT_CONFIG,
  LN_APP_CONFIG,
  ...ZAP_CONFIGS
]

export default LND_CONFIGS
