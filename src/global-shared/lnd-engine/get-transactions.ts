import { promisify } from 'util'
import bitcoin from 'btcnodejs'
import { LndActionOptions, Payment, PaymentStatus, ChainTransaction } from '../types/lnd-engine/client'
import { Invoice, InvoiceState } from '../types/lnd-engine/client/invoices'
import { getInvoices } from './get-invoices'
import { getPayments } from './get-payments'
import { getChainTransactions } from './get-chain-transactions'
import {
  Asset,
  Unit,
  Transaction,
  TransactionStatus,
  TransactionType
} from '../types'
import { asAmount } from '../currency-conversions'
import { deadline } from './deadline'

const SPARKSWAP_INVOICE_MEMO = 'sparkswap-swap-pivot'
const INVOICE_RECEIVE_FEE = 0
const NUM_CONFS_FOR_COMPLETE = 1

function invoiceStateToTransactionStatus (invoice: Invoice): TransactionStatus {
  switch (invoice.state) {
    case InvoiceState.OPEN:
    case InvoiceState.ACCEPTED:
      return TransactionStatus.PENDING
    case InvoiceState.SETTLED:
      return TransactionStatus.COMPLETE
    case InvoiceState.CANCELED:
      return TransactionStatus.FAILED
    default:
      return TransactionStatus.UNKNOWN
  }
}

function invoiceToTransaction (invoice: Invoice): Transaction {
  const date = invoice.state === InvoiceState.SETTLED
    ? new Date(parseInt(invoice.settleDate) * 1000)
    : new Date(parseInt(invoice.creationDate) * 1000)

  return {
    id: invoice.rHash,
    type: TransactionType.PCN_RECEIVE,
    status: invoiceStateToTransactionStatus(invoice),
    amount: {
      asset: Asset.BTC,
      unit: Unit.Satoshi,
      value: parseInt(invoice.value)
    },
    date,
    fee: {
      asset: Asset.BTC,
      unit: Unit.Satoshi,
      value: INVOICE_RECEIVE_FEE
    }
  }
}

function sortTransactionsDescending (a: Transaction, b: Transaction): number {
  return b.date.getTime() - a.date.getTime()
}

function paymentToTransactionStatus (payment: Payment): TransactionStatus {
  switch (payment.status) {
    case PaymentStatus.IN_FLIGHT:
      return TransactionStatus.PENDING
    case PaymentStatus.SUCCEEDED:
      return TransactionStatus.COMPLETE
    case PaymentStatus.FAILED:
      return TransactionStatus.FAILED
    case PaymentStatus.UNKNOWN:
      return TransactionStatus.UNKNOWN
  }
}

function paymentToTransaction (payment: Payment): Transaction {
  const date = new Date(parseInt(payment.creationDate) * 1000)

  return {
    id: payment.paymentHash,
    type: TransactionType.PCN_SEND,
    status: paymentToTransactionStatus(payment),
    amount: {
      asset: Asset.BTC,
      unit: Unit.Satoshi,
      value: parseInt(payment.valueSat)
    },
    date,
    fee: {
      asset: Asset.BTC,
      unit: Unit.Satoshi,
      value: parseInt(payment.feeSat)
    }
  }
}

enum ChannelType {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PENDING_OPEN = 'PENDING_OPEN',
  PENDING_CLOSE = 'PENDING_CLOSE',
  PENDING_FORCE_CLOSE = 'PENDING_FORCE_CLOSE',
  WAITING_CLOSE = 'WAITING_CLOSE'
}

enum ClosureType {
  COOPERATIVE_CLOSE = 'COOPERATIVE_CLOSE',
  LOCAL_FORCE_CLOSE = 'LOCAL_FORCE_CLOSE',
  REMOTE_FORCE_CLOSE = 'REMOTE_FORCE_CLOSE',
  BREACH_CLOSE = 'BREACH_CLOSE',
  FUNDING_CANCELED = 'FUNDING_CANCELED',
  ABANDONED = 'ABANDONED'
}

interface MinChannelDetails {
  channelPoint: string,
  channelType: ChannelType,
  closingTxHash?: string,
  closeType?: ClosureType
}

interface ChannelTxIds {
  openTxIds: Set<string>,
  coopCloseTxIds: Set<string>,
  forceCloseTxIds: Set<string>
}

function parseChannelTxIds (channels: MinChannelDetails[]): ChannelTxIds {
  const initialChannelIds: ChannelTxIds = {
    openTxIds: new Set<string>(),
    coopCloseTxIds: new Set<string>(),
    forceCloseTxIds: new Set<string>()
  }

  return channels.reduce((channelTxIds, channel) => {
    const openingTxHash = channel.channelPoint.split(':')[0]
    channelTxIds.openTxIds.add(openingTxHash)

    if (channel.closingTxHash) {
      if (channel.closeType === ClosureType.COOPERATIVE_CLOSE) {
        channelTxIds.coopCloseTxIds.add(channel.closingTxHash)
      }

      const isForceClose = channel.channelType === ChannelType.PENDING_FORCE_CLOSE ||
        channel.closeType === ClosureType.LOCAL_FORCE_CLOSE ||
        channel.closeType === ClosureType.REMOTE_FORCE_CLOSE ||
        channel.closeType === ClosureType.BREACH_CLOSE ||
        channel.closeType === ClosureType.FUNDING_CANCELED ||
        channel.closeType === ClosureType.ABANDONED

      if (isForceClose) {
        channelTxIds.forceCloseTxIds.add(channel.closingTxHash)
      }
    }

    return channelTxIds
  }, initialChannelIds)
}

async function getChannelTxIds ({ client }: LndActionOptions): Promise<ChannelTxIds> {
  const listChannels = promisify(client.listChannels).bind(client)
  const listClosedChannels = promisify(client.closedChannels).bind(client)
  const listPendingChannels = promisify(client.pendingChannels).bind(client)

  const [
    openChannels,
    closedChannels,
    pendingChannels
  ] = await Promise.all([
    listChannels({}, { deadline: deadline() }),
    listClosedChannels({
      abandoned: true,
      breach: true,
      cooperative: true,
      fundingCanceled: true,
      localForce: true,
      remoteForce: true
    }, { deadline: deadline() }),
    listPendingChannels({}, { deadline: deadline() })
  ])

  const allChannels: MinChannelDetails[] = [
    ...openChannels.channels.map(chan => Object.assign({}, chan, { channelType: ChannelType.OPEN })),
    ...closedChannels.channels.map(chan => Object.assign({}, chan, { channelType: ChannelType.CLOSED })),
    ...pendingChannels.pendingOpenChannels.map(chan => Object.assign({}, chan.channel, { channelType: ChannelType.PENDING_OPEN })),
    ...pendingChannels.pendingClosingChannels.map(chan => Object.assign({}, chan.channel, {
      closingTxHash: chan.closingTxid,
      channelType: ChannelType.PENDING_CLOSE
    })),
    ...pendingChannels.pendingForceClosingChannels.map(chan => Object.assign({}, chan.channel, {
      closingTxHash: chan.closingTxid,
      channelType: ChannelType.PENDING_FORCE_CLOSE
    })),
    ...pendingChannels.waitingCloseChannels.map(chan => Object.assign({}, chan.channel, { channelType: ChannelType.WAITING_CLOSE }))
  ]

  return parseChannelTxIds(allChannels)
}

function isChannelSweep (rawTx: string, channelTxIds: ChannelTxIds): boolean {
  const txDecoder = bitcoin.Transaction

  try {
    const tx = txDecoder.fromHex(rawTx)

    // TODO: This check will fail on sweep transactions that occur from the force
    // closing of a channel with our user having a localBalance of 0. There will
    // be more than 1 input but we are not sure why.
    //
    // Other implementations (goldengate et.al.) check for input length of 1 and
    // return in the same way so we will need to investigate.
    if (tx.inputs?.length !== 1) {
      return false
    }

    if (!tx.inputs[0].txid) {
      return false
    }

    return channelTxIds.forceCloseTxIds.has(tx.inputs[0].txid)
  } catch (e) {
    return false
  }
}

function getTransactionType (chainTx: ChainTransaction, channelTxIds: ChannelTxIds): TransactionType {
  if (channelTxIds.openTxIds.has(chainTx.txHash)) {
    return TransactionType.PCN_OPEN
  }

  if (channelTxIds.coopCloseTxIds.has(chainTx.txHash)) {
    return TransactionType.PCN_COOP_CLOSE
  }

  if (channelTxIds.forceCloseTxIds.has(chainTx.txHash)) {
    return TransactionType.PCN_FORCE_CLOSE
  }

  if (isChannelSweep(chainTx.rawTxHex, channelTxIds)) {
    return TransactionType.SWEEP
  }

  if (parseInt(chainTx.amount, 10) < 0) {
    return TransactionType.SEND
  }

  if (parseInt(chainTx.amount, 10) > 0) {
    return TransactionType.RECEIVE
  }

  return TransactionType.UNKNOWN
}

function chainTransactionToTransaction (chainTx: ChainTransaction, channelTxIds: ChannelTxIds): Transaction {
  const type = getTransactionType(chainTx, channelTxIds)

  const status = chainTx.numConfirmations < NUM_CONFS_FOR_COMPLETE
    ? TransactionStatus.PENDING
    : TransactionStatus.COMPLETE

  return {
    id: chainTx.txHash,
    date: new Date(parseInt(chainTx.timeStamp) * 1000),
    type,
    amount: asAmount(Asset.BTC, parseInt(chainTx.amount, 10)),
    status,
    fee: asAmount(Asset.BTC, parseInt(chainTx.totalFees, 10))
  }
}

export async function getTransactions ({ client, logger }: LndActionOptions): Promise<Transaction[]> {
  const transactions: Transaction[] = []
  const [
    invoices,
    payments,
    chainTransactions
  ] = await Promise.all([
    getInvoices({ client, logger }),
    getPayments({ client, logger }),
    getChainTransactions({ client, logger })
  ])

  const channelTxIds = await getChannelTxIds({ client, logger })

  // We filter invoices related to swaps since the consumer of `getTransactions` does not yet support filtering
  const nonSwapTransactions = invoices
    .filter(invoice => invoice.memo !== SPARKSWAP_INVOICE_MEMO)
    .map(invoiceToTransaction)

  transactions.push(...nonSwapTransactions)
  transactions.push(...payments.map(paymentToTransaction))
  transactions.push(...chainTransactions.map(tx => chainTransactionToTransaction(tx, channelTxIds)))

  return transactions.sort(sortTransactionsDescending)
}
