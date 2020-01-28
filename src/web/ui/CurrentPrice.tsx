import React, { ReactNode } from 'react'
import { Nullable } from '../../global-shared/types'
import { H1, H6, Classes } from '@blueprintjs/core'
import { marketDataSubscriber } from '../domain/market-data'
import { formatDollarValue } from '../../common/formatters'
import './CurrentPrice.css'

const CURRENCY_NAME = 'Bitcoin'
const CURRENCY_PAIR = 'BTC/USD'
// Used for sizing the skeleton outline while price is loading
const PLACEHOLDER_PRICE = 10000

enum Pulse {
  Red,
  Green
}

export enum Size {
  Small,
  Large
}

interface CurrentPriceProps {
  size?: Size
}

interface CurrentPriceState {
  currentPrice: Nullable<number>,
  pulse: Nullable<Pulse>
}

class CurrentPrice extends React.Component<CurrentPriceProps, CurrentPriceState> {
  pulseTimer?: NodeJS.Timeout

  constructor (props: CurrentPriceProps) {
    super(props)
    this.state = {
      currentPrice: marketDataSubscriber.currentPrice,
      pulse: null
    }
  }

  componentWillUnmount (): void {
    marketDataSubscriber.removeListener('update', this.handleData)
  }

  componentDidMount (): void {
    marketDataSubscriber.on('update', this.handleData)
  }

  handleData = (): void => {
    const existingPrice = this.state.currentPrice
    const newPrice = marketDataSubscriber.currentPrice
    this.setState({ currentPrice: newPrice })
    if (!existingPrice || !newPrice) {
      return
    }

    if (newPrice > existingPrice) {
      this.pulsePrice(Pulse.Green)
    } else if (newPrice < existingPrice) {
      this.pulsePrice(Pulse.Red)
    }
  }

  pulsePrice (type: Pulse): void {
    this.setState({ pulse: type })
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer)
    }
    this.pulseTimer = setTimeout(() => this.setState({ pulse: null }), 1000)
  }

  get className (): string {
    const {
      currentPrice,
      pulse
    } = this.state

    const classes = []

    if (currentPrice == null) {
      classes.push(Classes.SKELETON)
    }

    if (pulse === Pulse.Red) {
      classes.push('PulseRed')
    } else if (pulse === Pulse.Green) {
      classes.push('PulseGreen')
    }

    return classes.join(' ')
  }

  get displayPrice (): string {
    const {
      currentPrice
    } = this.state

    return formatDollarValue(currentPrice || PLACEHOLDER_PRICE)
  }

  render (): ReactNode {
    if (this.props.size === Size.Small) {
      return (
        <H6 className='current-price'>
          <span className='subtitle'>{CURRENCY_PAIR}</span>
          <span className={this.className}>{this.displayPrice}</span>
        </H6>
      )
    }
    return (
      <H1 className='current-price'>
        <span className='subtitle'>{CURRENCY_NAME} Price</span>
        <span className={this.className}>
          {this.displayPrice}
        </span>
      </H1>
    )
  }
}

export default CurrentPrice
