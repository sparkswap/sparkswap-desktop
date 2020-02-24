import {
  OpenChannelResponse,
  PendingOpenResponse,
  ChannelOpenResponse,
  CloseChannelResponse,
  PendingCloseResponse,
  ChannelCloseResponse
} from '../../types/lnd-engine/client'

export function isChannelOpenUpdateResponse (res: OpenChannelResponse): res is ChannelOpenResponse {
  return Object.keys(res).includes('chanOpen')
}

export function isPendingOpenResponse (res: OpenChannelResponse): res is PendingOpenResponse {
  return Object.keys(res).includes('chanPending')
}

export function isChannelCloseUpdateResponse (res: CloseChannelResponse): res is ChannelCloseResponse {
  return Object.keys(res).includes('chanClose')
}

export function isPendingCloseResponse (res: CloseChannelResponse): res is PendingCloseResponse {
  return Object.keys(res).includes('closePending')
}
