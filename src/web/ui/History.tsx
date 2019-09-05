import React, { ReactNode } from 'react'
import './History.css'
import { HTMLTable, H4, Spinner } from '@blueprintjs/core'
import { Trade, TradeStatus } from '../../common/types'
import { formatDate, formatAmount } from './formatters'
import { trades, updater as tradeUpdater } from '../domain/history'

interface HistoryRowProps {
  trade: Trade
}

class HistoryRow extends React.PureComponent<HistoryRowProps> {
  render (): ReactNode {
    const { trade } = this.props
    const className = trade.status === TradeStatus.COMPLETE ? undefined : 'text-muted'

    // Assumes buying BTC
    const amountBtc = formatAmount(trade.destinationAmount)
    const amountUsd = formatAmount(trade.sourceAmount)

    const dateField =
      trade.status === TradeStatus.PENDING
        ? <Spinner className='trade-status-spinner' size={12} />
        : formatDate(trade.endTime || trade.startTime)

    return (
      <tr>
        <td className={className}>{amountBtc}</td>
        <td className={className}>{amountUsd}</td>
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
