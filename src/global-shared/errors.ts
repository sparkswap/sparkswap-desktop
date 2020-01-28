import { Engine } from './types'
import { AnchorEngine } from './anchor-engine'
import LndEngine from './lnd-engine'

const {
  PermanentSwapError: LndPermanentSwapError,
  ExpiredSwapError: LndExpiredSwapError,
  CanceledSwapError: LndCanceledSwapError,
  SettledSwapError: LndSettledSwapError
} = LndEngine.ERRORS

const {
  PermanentSwapError: AnchorPermanentSwapError,
  ExpiredSwapError: AnchorExpiredSwapError,
  CanceledSwapError: AnchorCanceledSwapError,
  SettledSwapError: AnchorSettledSwapError
} = AnchorEngine.ERRORS

interface EngineErrors {
  PermanentSwapError: typeof LndPermanentSwapError | typeof AnchorPermanentSwapError,
  ExpiredSwapError: typeof LndExpiredSwapError | typeof AnchorExpiredSwapError,
  CanceledSwapError: typeof LndCanceledSwapError | typeof AnchorCanceledSwapError,
  SettledSwapError: typeof LndSettledSwapError | typeof AnchorSettledSwapError
}

export function getEngineErrors (engine: Engine): EngineErrors {
  if (engine instanceof LndEngine) {
    return LndEngine.ERRORS
  }
  if (engine instanceof AnchorEngine) {
    return AnchorEngine.ERRORS
  }

  throw new Error('Invalid Engine')
}
