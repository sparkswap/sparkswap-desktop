import { UnknownObject } from '../../global-shared/types'

// see: https://plaid.com/docs/#onevent-callback

const PLAID_MESSAGE_ACTION = 'plaid_link-1::event'
type PlaidMessageAction = 'plaid_link-1::event'

export enum PlaidEvent {
  OPEN = 'OPEN',
  EXIT = 'EXIT',
  HANDOFF = 'HANDOFF'
}

export interface PlaidMessage {
  action: PlaidMessageAction,
  eventName: PlaidEvent,
  [key: string]: PlaidMessageAction | PlaidEvent
}

export function isPlaidMessage (message: UnknownObject): message is PlaidMessage {
  if (message.action !== PLAID_MESSAGE_ACTION) {
    return false
  }

  if (message.eventName === PlaidEvent.OPEN ||
      message.eventName === PlaidEvent.EXIT ||
      message.eventName === PlaidEvent.HANDOFF) {
    return true
  }

  return false
}
