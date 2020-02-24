import React, { ReactNode } from 'react'
import { Intent } from '@blueprintjs/core'
import { addSignToAmount } from '../../../global-shared/util'
import { Asset, Amount, Nullable } from '../../../global-shared/types'
import { Trade, TradeStatus } from '../../../common/types'
import { formatAmount } from '../../../common/formatters'
import { toCommonPrice } from '../../../global-shared/currency-conversions'
import { PulseColor } from '../components/DisplayValue'
import TxCard from '../components/TxCard'

interface TradeProps {
  trade: Trade
}

interface TradeState {
  pulseColor: Nullable<PulseColor>
}

class TradeCard extends React.PureComponent<TradeProps, TradeState> {
  constructor (props: TradeProps) {
    super(props)

    this.state = {
      pulseColor: null
    }
  }

  componentDidUpdate (prevProps: TradeProps): void {
    if (prevProps.trade.status !== this.props.trade.status &&
        prevProps.trade.status === TradeStatus.PENDING) {
      this.setState({ pulseColor: this.isFailed ? PulseColor.Red : PulseColor.Green })
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

  get usdAmount (): Amount {
    return this.bought ? this.props.trade.sourceAmount : this.props.trade.destinationAmount
  }

  get btcAmount (): Amount {
    return this.bought ? this.props.trade.destinationAmount : this.props.trade.sourceAmount
  }

  get title (): string {
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
      <TxCard
        className='trade'
        icon={this.isFailed ? 'cross' : 'swap-horizontal'}
        intent={this.isFailed ? Intent.DANGER : Intent.NONE}
        loading={this.isPending}
        title={this.title}
        pulseColor={this.state.pulseColor}
        resetPulse={() => this.setState({ pulseColor: null })}
        date={this.props.trade.endTime || this.props.trade.startTime}
        extraInfo={{
          title: 'Price',
          info: formatAmount(toCommonPrice(this.btcAmount.value, this.usdAmount.value))
        }}
        amount={addSignToAmount(this.btcAmount, this.bought)}
        secondaryAmount={addSignToAmount(this.usdAmount, !this.bought)}
      />
    )
  }
}

export default TradeCard
