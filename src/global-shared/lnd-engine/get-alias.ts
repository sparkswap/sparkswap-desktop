import { LndActionOptions } from '../types/lnd-engine/client'
import { deadline } from './deadline'
import { promisify } from 'util'

export async function getAlias (publicKey: string, { client }: LndActionOptions): Promise<string> {
  const getNodeInfo = promisify(client.getNodeInfo).bind(client)

  const { node } = await getNodeInfo({ pubKey: publicKey }, { deadline: deadline() })

  return node.alias
}
