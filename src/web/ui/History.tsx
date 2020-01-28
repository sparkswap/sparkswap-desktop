import React, { ReactNode } from 'react'
import './History.css'
import {
  Spinner,
  Button,
  Card,
  Icon,
  H5,
  H6,
  Intent,
  NonIdealState,
  Tooltip
} from '@blueprintjs/core'
import { Asset, Amount } from '../../global-shared/types'
import { Trade, TradeStatus } from '../../common/types'
import {
  formatDate,
  formatAsset,
  formatTime
} from './formatters'
import { showErrorToast, showSuccessToast } from './AppToaster'
import { loadTrades } from '../domain/history'
import { toCommonPrice } from '../../common/currency-conversions'
import { exportTransactions } from '../domain/main-request'
import { formatAmount } from '../../common/formatters'

interface TradeProps {
  trade: Trade
}

interface TradeState {
  pulse: boolean
}

class TradeCard extends React.PureComponent<TradeProps, TradeState> {
  constructor (props: TradeProps) {
    super(props)

    this.state = {
      pulse: false
    }
  }

  componentDidUpdate (prevProps: TradeProps): void {
    if (prevProps.trade.status !== this.props.trade.status &&
        prevProps.trade.status === TradeStatus.PENDING) {
      this.setState({ pulse: true })
      setTimeout(() => this.setState({ pulse: false }), 1000)
    }
  }

  get isPending (): boolean {
    return this.props.trade.status === TradeStatus.PENDING
  }

  get isFailed (): boolean {
    return this.props.trade.status === TradeStatus.FAILED
  }

  get bought (): boolean {
    return this.props.trade.destinationAmount.asset === Asset.BTC
  }

  get price (): Amount {
    return toCommonPrice(this.btcAmount.value, this.usdAmount.value)
  }

  get usdAmount (): Amount {
    return this.bought ? this.props.trade.sourceAmount : this.props.trade.destinationAmount
  }

  get btcAmount (): Amount {
    return this.bought ? this.props.trade.destinationAmount : this.props.trade.sourceAmount
  }

  get date (): Date {
    return this.props.trade.endTime || this.props.trade.startTime
  }

  get formattedUsd (): string {
    const sign = this.bought ? '-' : '+'

    return `${sign} ${formatAmount(this.usdAmount)} ${formatAsset(Asset.USDX)}`
  }

  get formattedBtc (): string {
    const sign = this.bought ? '+' : '-'

    return `${sign} ${formatAmount(this.btcAmount)} ${formatAsset(Asset.BTC)}`
  }

  get pulseClassName (): string {
    if (!this.state.pulse) return ''

    if (this.isFailed) return 'PulseRed'

    return 'PulseGreen'
  }

  renderIcon (): ReactNode {
    if (this.isPending) {
      return <Spinner className='trade-status-spinner' size={16} />
    }

    if (this.isFailed) {
      return <Icon intent={Intent.DANGER} icon='cross' />
    }
    return <Icon icon='swap-horizontal' className={this.pulseClassName} />
  }

  renderTitle (): string {
    if (this.isFailed) {
      return 'Failed Trade'
    }

    if (this.bought) {
      if (this.isPending) {
        return 'Buying Bitcoin'
      }
      return 'Bought Bitcoin'
    }

    if (this.isPending) {
      return 'Selling Bitcoin'
    }
    return 'Sold Bitcoin'
  }

  render (): ReactNode {
    return (
      <Card className='transaction trade'>
        {this.renderIcon()}
        <H5 className='transaction-type'>
          <span className={this.pulseClassName}>
            {this.renderTitle()}
          </span>
          <br />
          <Tooltip
            targetClassName='subtitle'
            content={`${formatDate(this.date)} ${formatTime(this.date)}`}
            boundary='window'
          >
            {formatDate(this.date)}
          </Tooltip>
        </H5>
        <H6 className='price'>
          <span className='subtitle'>Price</span>
          {formatAmount(this.price)}
        </H6>
        <H6 className='amounts'>
          {this.formattedBtc}
          <br />
          <span className='subtitle'>{this.formattedUsd}</span>
        </H6>
      </Card>
    )
  }
}

interface HistoryProps {
  trades: Trade[],
  canLoadMore: boolean
}

interface HistoryState {
  loading: boolean
}

class History extends React.Component<HistoryProps, HistoryState> {
  constructor (props: HistoryProps) {
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

  maybeRenderLoadMore (): React.ReactNode {
    if (!this.props.canLoadMore) {
      return
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

  render (): React.ReactNode {
    const { trades } = this.props

    if (!trades.length) {
      return (
        <div className='History'>
          <NonIdealState
            title='No Transactions'
            description="You haven't made any trades yet. When you do, they'll show up here."
            icon='inbox'
          />
        </div>
      )
    }

    return (
      <React.Fragment>
        <div className='export-row'>
          <Button className='export-button' rightIcon='export' onClick={this.handleExport} minimal>
            Export CSV
          </Button>
        </div>
        <div className='History'>
          {trades.map(trade => <TradeCard trade={trade} key={trade.id} />)}
          {this.maybeRenderLoadMore()}
        </div>
      </React.Fragment>
    )
  }
}

export default History
