import React, { ReactNode } from 'react'
import { Amount, Nullable } from '../../../global-shared/types'
import { marketDataSubscriber } from '../../domain/market-data'
import { altAmount } from '../../domain/convert-amount'
import { formatAmount } from '../../../common/formatters'

type FlexibleAmount = Nullable<Amount | Error>

interface ConvertedValueProps {
  className?: string,
  amount: FlexibleAmount
}

interface ConvertedValueState {
  currentPrice: Nullable<number>
}

export default class ConvertedValue extends React.Component<ConvertedValueProps, ConvertedValueState> {
  constructor (props: ConvertedValueProps) {
    super(props)
    this.state = {
      currentPrice: marketDataSubscriber.currentPrice
    }
  }

  onData = (): void => {
    const { currentPrice } = marketDataSubscriber
    this.setState({ currentPrice })
  }

  componentWillUnmount (): void {
    marketDataSubscriber.removeListener('update', this.onData)
  }

  componentDidMount (): void {
    marketDataSubscriber.on('update', this.onData)
  }

  render (): ReactNode {
    const { amount } = this.props

    const currentPrice = this.state.currentPrice

    if (amount instanceof Error || amount === null || currentPrice === null) {
      return <span className={this.props.className}></span>
    }

    return (
      <span className={this.props.className}>
        &asymp;&nbsp;{formatAmount(altAmount(amount, currentPrice), { includeAsset: true })}
      </span>
    )
  }
}
