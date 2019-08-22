import React, { ReactNode } from 'react'
import './History.css'
import { HTMLTable, H4 } from '@blueprintjs/core'
import { Trade, TradeStatus } from '../../common/types'
import { formatDate, formatAmount } from './formatters'
import { trades, updater as tradeUpdater } from '../domain/history'

interface HistoryRowProps {
  trade: Trade
}

class HistoryRow extends React.Component<HistoryRowProps> {
  render (): ReactNode {
    const { trade } = this.props
    // TODO: handle failed case?
    const className = trade.status === TradeStatus.PENDING ? 'text-muted' : undefined

    // Assumes buying BTC
    const amountBtc = formatAmount(trade.destinationAmount)
    const amountUsd = formatAmount(trade.sourceAmount)

    // const formattedDate = trade.endTime ? formatDate(trade.endTime) : formatDate(trade.startTime)
    const formattedDate = formatDate(trade.endTime || trade.startTime)

    return (
      <tr>
        <td className={className}>{amountBtc}</td>
        <td className={className}>{amountUsd}</td>
        <td className='text-muted DateColumn'>{formattedDate}</td>
      </tr>
    )
  }
}

interface HistoryState {
  trades: Trade[]
}

class History extends React.Component<{}, HistoryState> {
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
                {trades.map((trade, key) => <HistoryRow trade={trade} key={key} />)}
              </tbody>
            </HTMLTable>
          </div>
        </div>
      </div>
    )
  }
}

export default History
