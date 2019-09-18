import { app } from 'electron'
import * as path from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import logger from '../global-shared/logger'
import { Auth, LndConfig } from '../common/types'
import { UnknownObject } from '../global-shared/types'

const CONFIG_NAME = 'sparkswap-config.json'

export interface AnchorConfig {
  apiKey: string,
  email: string
}

export interface Config {
  lnd: LndConfig,
  auth: Auth,
  anchor: AnchorConfig
}

const defaults = {
  lnd: {
    hostName: '',
    port: 0,
    tlsCertPath: '',
    macaroonPath: '',
    configured: false
  },
  auth: {
    uuid: '',
    apiKey: ''
  },
  anchor: {
    apiKey: '',
    email: ''
  }
}

function getConfigPath (): string {
  const directory = app.getPath('userData')

  return path.join(directory, CONFIG_NAME)
}

function loadConfig (): Config | {} {
  const path = getConfigPath()
  if (!existsSync(path)) {
    logger.warn(`No configuration available at path: ${path}`)
    return {}
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    logger.error(`Failed to load config file at path: ${path}`)
    throw e
  }
}

function isObject (obj: unknown): obj is UnknownObject {
  return obj && typeof obj === 'object' && !Array.isArray(obj)
}

function deepMerge (target: UnknownObject, source: UnknownObject): UnknownObject {
  const newObj = Object.assign({}, target)

  for (const key in source) {
    const sourceVal = source[key]
    const targetVal = newObj[key]
    if (isObject(sourceVal)) {
      if (isObject(targetVal)) {
        newObj[key] = deepMerge(targetVal, sourceVal)
      } else {
        newObj[key] = deepMerge({}, sourceVal)
      }
    } else {
      newObj[key] = sourceVal
    }
  }

  return newObj
}

function addConfig (key: string, value: unknown): void {
  const config = loadConfig()

  const updatedConfig = deepMerge(config as UnknownObject, { [key]: value })

  // pretty print for human readability
  const stringifiedConfig = JSON.stringify(updatedConfig, null, 2)

  writeFileSync(getConfigPath(), stringifiedConfig)
}

function getConfig (): Config {
  return Object.assign({}, defaults, loadConfig())
}

export { addConfig, getConfig }
