import { Asset } from '../global-shared/types'

export class BalanceError extends Error {
  asset: Asset

  constructor (message: string, asset: Asset) {
    super(message)
    this.asset = asset
  }
}

export class QuantityError extends Error {
  asset: Asset

  constructor (message: string, asset: Asset) {
    super(message)
    this.asset = asset
  }
}
