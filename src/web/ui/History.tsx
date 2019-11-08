import React, { ReactNode } from 'react'
import './History.css'
import { HTMLTable, H4, Spinner } from '@blueprintjs/core'
import { Trade, TradeStatus } from '../../common/types'
import { formatDate, formatAmount } from './formatters'
import { trades, updater as tradeUpdater } from '../domain/history'

interface HistoryRowProps {
  trade: Trade
}

const STATUS_CLASS_NAMES = Object.freeze({
  [TradeStatus.UNKNOWN]: 'text-muted',
  [TradeStatus.PENDING]: 'text-muted',
  [TradeStatus.COMPLETE]: '',
  [TradeStatus.FAILED]: 'error text-muted'
})

function addMutedSpan (text: string): ReactNode {
  const reversed = text.split('').reverse().join('')
  let reverseIndex = 0

  while (reversed[reverseIndex] === '0' || reversed[reverseIndex] === '.') {
    reverseIndex++
  }

  const index = text.length - reverseIndex

  return (
    <React.Fragment>
      {text.slice(0, index)}<span className='text-muted'>{text.slice(index)}</span>
    </React.Fragment>
  )
}

class HistoryRow extends React.PureComponent<HistoryRowProps> {
  render (): ReactNode {
    const { trade } = this.props

    // Assumes buying BTC
    const amountBtc = addMutedSpan(formatAmount(trade.destinationAmount))
    // remove dollar sign, we'll apply in styles
    const amountUsd = addMutedSpan(formatAmount(trade.sourceAmount).slice(1))

    const dateField =
      trade.status === TradeStatus.PENDING
        ? <Spinner className='trade-status-spinner' size={12} />
        : formatDate(trade.endTime || trade.startTime)

    return (
      <tr className={STATUS_CLASS_NAMES[trade.status]}>
        <td className='trade-amount'>{amountBtc}</td>
        <td className='trade-amount usd'>{amountUsd}</td>
        <td className='text-muted DateColumn'>{dateField}</td>
      </tr>
    )
  }
}

interface HistoryState {
  trades: Trade[]
}

class History extends React.PureComponent<{}, HistoryState> {
  constructor (props: object) {
    super(props)
    this.state = {
      trades
    }
  }

  componentDidMount (): void {
    tradeUpdater.on('update', trades => this.setState({ trades }))
  }

  render (): React.ReactNode {
    const { trades } = this.state

    return (
      <div className="History">
        <H4 className='HistoryTitle'>History</H4>
        <div className="table-outer">
          <div className="table-inner">
            <HTMLTable condensed={true}>
              <thead>
                <tr>
                  <th className='text-muted'>Size (BTC)</th>
                  <th className='text-muted'>Size (USD)</th>
                  <th className='text-muted DateColumn'>Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => <HistoryRow trade={trade} key={trade.id} />)}
              </tbody>
            </HTMLTable>
          </div>
        </div>
      </div>
    )
  }
}

export default History
