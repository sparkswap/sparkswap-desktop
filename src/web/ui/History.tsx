import React, { ReactNode } from 'react'
import './History.css'
import { HTMLTable, H4, Spinner, Button } from '@blueprintjs/core'
import { Trade, TradeStatus } from '../../common/types'
import { formatDate, formatAmount, addMutedSpan } from './formatters'
import { showErrorToast } from './AppToaster'
import {
  trades,
  updater as tradeUpdater,
  loadTrades,
  canLoadMore as canLoadMoreTrades
} from '../domain/history'

interface HistoryRowProps {
  trade: Trade
}

const STATUS_CLASS_NAMES = Object.freeze({
  [TradeStatus.UNKNOWN]: 'text-muted',
  [TradeStatus.PENDING]: 'text-muted',
  [TradeStatus.COMPLETE]: '',
  [TradeStatus.FAILED]: 'error text-muted'
})

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
  trades: Trade[],
  loading: boolean,
  canLoadMore: boolean
}

function mapToArr (tradesMap: Map<number, Trade>): Trade[] {
  return Array.from(tradesMap.values()).sort((a, b) => {
    return b.id - a.id
  })
}

class History extends React.PureComponent<{}, HistoryState> {
  constructor (props: object) {
    super(props)

    this.state = {
      trades: mapToArr(trades),
      loading: false,
      canLoadMore: canLoadMoreTrades
    }
  }

  componentDidMount (): void {
    tradeUpdater.on('update', trades => {
      this.setState({
        trades: mapToArr(trades),
        canLoadMore: canLoadMoreTrades
      })
    })
  }

  handleLoadMore = async (): Promise<void> => {
    this.setState({ loading: true })
    const { trades } = this.state
    try {
      const lastTradeId = trades.length ? trades[trades.length - 1].id : undefined
      const canLoadMore = await loadTrades(lastTradeId)
      this.setState({ canLoadMore })
    } catch (e) {
      showErrorToast(`Error while loading additional trades: ${e.message}`)
    } finally {
      this.setState({ loading: false })
    }
  }

  renderLoadMore (): React.ReactNode {
    if (!this.state.canLoadMore) {
      return
    }

    return (
      <Button
        fill={true}
        minimal={true}
        loading={this.state.loading}
        onClick={this.handleLoadMore}
      >
        Load more...
      </Button>
    )
  }

  render (): React.ReactNode {
    const { trades } = this.state

    return (
      <div className="History">
        <div className="title-row">
          <H4 className='HistoryTitle'>History</H4>
          <Button
            icon='export'
            // onClick={this.toggleDialog}
            minimal
          />
        </div>
        <div className="table-outer">
          <div className="table-inner">
            <HTMLTable className='trade-table' condensed={true}>
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
            {this.renderLoadMore()}
          </div>
        </div>
      </div>
    )
  }
}

export default History
