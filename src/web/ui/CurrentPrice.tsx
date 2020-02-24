import React, { ReactNode } from 'react'
import { Nullable } from '../../global-shared/types'
import { H1, H6 } from '@blueprintjs/core'
import { marketDataSubscriber } from '../domain/market-data'
import { formatDollarValue } from '../../common/formatters'
import { DisplayValue, PulseColor } from './components/DisplayValue'
import './CurrentPrice.css'

const CURRENCY_NAME = 'Bitcoin'
const CURRENCY_PAIR = 'BTC/USD'
// Used for sizing the skeleton outline while price is loading
const PLACEHOLDER_PRICE = 10000

export enum Size {
  Small,
  Large
}

interface CurrentPriceProps {
  size?: Size
}

interface CurrentPriceState {
  currentPrice: Nullable<number>,
  pulseColor: Nullable<PulseColor>
}

class CurrentPrice extends React.Component<CurrentPriceProps, CurrentPriceState> {
  constructor (props: CurrentPriceProps) {
    super(props)
    this.state = {
      currentPrice: marketDataSubscriber.currentPrice,
      pulseColor: null
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
      this.setState({ pulseColor: PulseColor.Green })
    } else if (newPrice < existingPrice) {
      this.setState({ pulseColor: PulseColor.Red })
    }
  }

  renderPrice (): ReactNode {
    const {
      currentPrice,
      pulseColor
    } = this.state

    return (
      <DisplayValue
        pulseColor={pulseColor}
        resetPulse={() => this.setState({ pulseColor: null })}
        loading={currentPrice == null}
      >
        {formatDollarValue(currentPrice || PLACEHOLDER_PRICE)}
      </DisplayValue>
    )
  }

  render (): ReactNode {
    if (this.props.size === Size.Small) {
      return (
        <H6 className='current-price'>
          <span className='subtitle'>{CURRENCY_PAIR}</span>
          {this.renderPrice()}
        </H6>
      )
    }
    return (
      <H1 className='current-price'>
        <span className='subtitle'>{CURRENCY_NAME} Price</span>
        {this.renderPrice()}
      </H1>
    )
  }
}

export default CurrentPrice
