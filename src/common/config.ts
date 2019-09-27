export const IS_PRODUCTION = process.env.NODE_ENV !== 'development'
export const IS_DEVELOPMENT = !IS_PRODUCTION
export const IS_TEST = process.env.NODE_ENV === 'test'

export const API_URL = IS_PRODUCTION ? 'https://stack.sparkswap.com' : 'http://localhost:3000'
export const WEBSOCKETS_URL = IS_PRODUCTION ? 'wss://stack.sparkswap.com' : 'ws://localhost:3000'

export * from '../global-shared/api'
