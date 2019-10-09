import { SwapHash, Amount, SwapPreimage } from '../global-shared/types'
import { ConnectionConfig } from '../global-shared/types/lnd'

export interface LndConfig extends ConnectionConfig {
  configured: boolean
}

export interface Quote {
  hash: SwapHash,
  destinationAmount: Amount,
  sourceAmount: Amount
}

export enum TradeFailureReason {
  UNKNOWN = 0,
  PREPARE_SWAP_ERROR = 1,
  SERVER_EXECUTE_ERROR = 2,
  PERMANENT_FORWARD_ERROR= 3
}

export enum TradeStatus {
  UNKNOWN,
  PENDING,
  COMPLETE,
  FAILED
}

export interface Trade extends Quote {
  id: number,
  startTime: Date,
  endTime?: Date,
  preimage?: SwapPreimage,
  failureCode?: TradeFailureReason,
  status: TradeStatus
}
