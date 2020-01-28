import { LndActionOptions } from '../types/lnd-engine/client'
import { GrpcError } from '../types/lnd-engine/client/grpc'
import { deadline } from './deadline'
import { promisify } from 'util'

function alreadyConnected (err: GrpcError): boolean {
  return (err && err.code === 2 && err.details != null && err.details.includes('already connected to peer'))
}

export async function connectPeer (publicKey: string, host: string, { client, logger }: LndActionOptions): Promise<void> {
  const connect = promisify(client.connectPeer).bind(client)
  const addr = {
    pubkey: publicKey,
    host
  }

  try {
    await connect({ addr }, { deadline: deadline() })
  } catch (e) {
    if (alreadyConnected(e)) {
      logger.debug(`Peer already connected: ${publicKey}`)
      return
    }
    throw e
  }
}
