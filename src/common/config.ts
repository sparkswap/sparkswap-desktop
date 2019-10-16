export const IS_PRODUCTION = process.env.NODE_ENV !== 'development' && process.env.REACT_APP_ENV !== 'test'
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_TEST = process.env.REACT_APP_ENV === 'test'

export const API_URL = IS_PRODUCTION ? 'https://stack.sparkswap.com' : 'http://localhost:3000'
export const WEBSOCKETS_URL = IS_PRODUCTION ? 'wss://stack.sparkswap.com' : 'ws://localhost:3000'

export const ZAPIER_HOOK = 'https://hooks.zapier.com/hooks/catch/5808043/o2fl9bt/'
export const IP_API_URL = 'https://ipapi.co/json'

export * from '../global-shared/api'
