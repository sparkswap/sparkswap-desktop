const GRAPH_LINK_PREFIX = 'https://1ml.com/node/'
const TX_LINK_PREFIX = 'https://blockstream.info/tx/'

export function getGraphLink (pubKey: string): string {
  return `${GRAPH_LINK_PREFIX}${pubKey}`
}

export function getTxLink (txHash: string, txOutput?: string): string {
  const outputQuery = txOutput ? `?output:${txOutput}` : ''
  return `${TX_LINK_PREFIX}${txHash}${outputQuery}`
}
