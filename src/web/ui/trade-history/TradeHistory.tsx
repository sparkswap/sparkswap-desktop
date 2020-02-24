import React, { ReactNode } from 'react'
import './TradeHistory.css'
import { Button } from '@blueprintjs/core'
import { Trade } from '../../../common/types'
import { showErrorToast, showSuccessToast } from '../AppToaster'
import { loadTrades } from '../../domain/history'
import { exportTransactions } from '../../domain/main-request'
import EmptyableList from '../components/EmptyableList'
import TradeCard from './TradeCard'

interface TradeHistoryProps {
  trades: Trade[],
  canLoadMore: boolean
}

interface TradeHistoryState {
  loading: boolean
}

class TradeHistory extends React.Component<TradeHistoryProps, TradeHistoryState> {
  constructor (props: TradeHistoryProps) {
    super(props)

    this.state = {
      loading: false
    }
  }

  handleLoadMore = async (): Promise<void> => {
    this.setState({ loading: true })
    const { trades } = this.props
    try {
      const lastTradeId = trades.length ? trades[trades.length - 1].id : undefined
      await loadTrades(lastTradeId)
    } catch (e) {
      showErrorToast(`Error while loading additional trades: ${e.message}`)
    } finally {
      this.setState({ loading: false })
    }
  }

  async handleExport (): Promise<void> {
    try {
      const success = await exportTransactions()
      // If `success` returns false then the request has been cancelled by the user
      if (success) {
        showSuccessToast('Successfully exported transactions to CSV')
      }
    } catch (e) {
      showErrorToast(`Error when exporting: ${e.message}`)
    }
  }

  maybeRenderLoadMore (): React.ReactNode {
    if (!this.props.canLoadMore) {
      return null
    }

    return (
      <Button
        fill
        minimal
        large
        loading={this.state.loading}
        onClick={this.handleLoadMore}
      >
        Load more...
      </Button>
    )
  }

  maybeRenderExport (): ReactNode {
    if (!this.props.trades.length) {
      return
    }

    return (
      <div className='export-row'>
        <Button
          className='export-button'
          rightIcon='export'
          onClick={this.handleExport}
          minimal
        >
          Export CSV
        </Button>
      </div>
    )
  }

  render (): React.ReactNode {
    return (
      <React.Fragment>
        {this.maybeRenderExport()}
        <EmptyableList
          className='History'
          name='trades'
        >
          {this.props.trades.map(trade => <TradeCard trade={trade} key={trade.id} />)}
          {this.maybeRenderLoadMore()}
        </EmptyableList>
      </React.Fragment>
    )
  }
}

export default TradeHistory
