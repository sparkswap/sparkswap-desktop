import React, { ReactNode } from 'react'
import {
  IconName,
  Intent
} from '@blueprintjs/core'
import {
  Asset,
  Transaction,
  TransactionType,
  TransactionStatus
} from '../../../global-shared/types'
import { addSignToAmount } from '../../../global-shared/util'
import TxCard, { ExtraInfo } from '../components/TxCard'

const LIGHTNING_EXTRA_INFO: ExtraInfo = Object.freeze({
  title: 'via',
  info: 'Lightning'
})

const ON_CHAIN_EXTRA_INFO: ExtraInfo = Object.freeze({
  title: 'via',
  info: 'On-Chain'
})

function failedTransactionName (tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.SEND:
    case TransactionType.PCN_SEND:
      return tx.amount.asset === Asset.USDX ? 'Withdrawal' : 'Send'
    case TransactionType.RECEIVE:
    case TransactionType.PCN_RECEIVE:
      return tx.amount.asset === Asset.USDX ? 'Deposit' : 'Receive'
    case TransactionType.PCN_OPEN:
      return 'Channel Open'
    case TransactionType.PCN_COOP_CLOSE:
      return 'Co-op Close'
    case TransactionType.PCN_FORCE_CLOSE:
      return 'Force Close'
    case TransactionType.SWEEP:
      return 'Channel Sweep'
    case TransactionType.UNKNOWN:
      // We should never hit this, since we don't display unknown transactions
      return 'Unknown'
  }
}

function pendingTransactionName (tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.SEND:
    case TransactionType.PCN_SEND:
      return tx.amount.asset === Asset.USDX ? 'Withdrawing' : 'Sending'
    case TransactionType.RECEIVE:
    case TransactionType.PCN_RECEIVE:
      return tx.amount.asset === Asset.USDX ? 'Depositing' : 'Receiving'
    case TransactionType.PCN_OPEN:
      return 'Channel Open'
    case TransactionType.PCN_COOP_CLOSE:
      return 'Co-op Close'
    case TransactionType.PCN_FORCE_CLOSE:
      return 'Force Close'
    case TransactionType.SWEEP:
      return 'Channel Sweep'
    case TransactionType.UNKNOWN:
      return 'Unknown'
  }
}

function completeTransactionName (tx: Transaction): string {
  switch (tx.type) {
    case TransactionType.SEND:
    case TransactionType.PCN_SEND:
      return tx.amount.asset === Asset.USDX ? 'Withdrew' : 'Sent'
    case TransactionType.RECEIVE:
    case TransactionType.PCN_RECEIVE:
      return tx.amount.asset === Asset.USDX ? 'Deposited' : 'Received'
    case TransactionType.PCN_OPEN:
      return 'Channel Open'
    case TransactionType.PCN_COOP_CLOSE:
      return 'Co-op Close'
    case TransactionType.PCN_FORCE_CLOSE:
      return 'Force Close'
    case TransactionType.SWEEP:
      return 'Channel Sweep'
    case TransactionType.UNKNOWN:
      return 'Unknown'
  }
}

function transactionName (tx: Transaction): string {
  switch (tx.status) {
    case TransactionStatus.FAILED:
      return failedTransactionName(tx)
    case TransactionStatus.PENDING:
      return pendingTransactionName(tx)
    case TransactionStatus.COMPLETE:
      return completeTransactionName(tx)
    case TransactionStatus.UNKNOWN:
      return 'Unknown'
  }
}

// TODO: update icons for different types
const TRANSACTION_TYPE_ICON: Record<TransactionType, IconName> = Object.freeze({
  [TransactionType.SEND]: 'circle-arrow-up',
  [TransactionType.RECEIVE]: 'circle-arrow-down',
  [TransactionType.PCN_SEND]: 'circle-arrow-up',
  [TransactionType.PCN_RECEIVE]: 'circle-arrow-down',
  [TransactionType.PCN_OPEN]: 'circle-arrow-up',
  [TransactionType.PCN_COOP_CLOSE]: 'circle-arrow-down',
  [TransactionType.PCN_FORCE_CLOSE]: 'circle-arrow-down',
  [TransactionType.SWEEP]: 'circle-arrow-down',
  [TransactionType.UNKNOWN]: 'flag' // this will never be displayed
})

function transactionIcon (tx: Transaction): IconName {
  if (tx.status === TransactionStatus.FAILED) {
    return 'cross'
  }

  if (tx.status === TransactionStatus.PENDING) {
    return 'time'
  }

  return TRANSACTION_TYPE_ICON[tx.type]
}

function getExtraInfo (tx: Transaction): ExtraInfo | undefined {
  if (tx.amount.asset !== Asset.BTC) {
    return
  }

  if (tx.type === TransactionType.PCN_SEND || tx.type === TransactionType.PCN_RECEIVE) {
    return LIGHTNING_EXTRA_INFO
  }

  return Object.assign({}, ON_CHAIN_EXTRA_INFO, { txId: tx.id })
}

function isPositiveAmount (tx: Transaction): boolean {
  if (tx.type === TransactionType.SEND || tx.type === TransactionType.PCN_SEND) {
    return false
  }

  if (tx.type === TransactionType.PCN_OPEN && tx.amount.value < 0) {
    return false
  }

  return true
}

interface TransactionCardProps {
  transaction: Transaction
}

class TransactionCard extends React.Component<TransactionCardProps> {
  render (): ReactNode {
    const { transaction } = this.props

    if (transaction.type === TransactionType.UNKNOWN) {
      return null
    }

    return (
      <TxCard
        icon={transactionIcon(transaction)}
        intent={transaction.status === TransactionStatus.FAILED ? Intent.DANGER : Intent.NONE}
        title={transactionName(transaction)}
        date={transaction.date}
        amount={addSignToAmount(transaction.amount, isPositiveAmount(transaction))}
        secondaryAmount={{
          title: 'Fee',
          amount: transaction.fee,
          options: { includeSign: false, includeAsset: false }
        }}
        extraInfo={getExtraInfo(transaction)}
      />
    )
  }
}

export default TransactionCard
