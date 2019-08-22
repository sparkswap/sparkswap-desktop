import React, { ReactNode } from 'react'
import {
  Button,
  FormGroup,
  NumericInput,
  H6
} from '@blueprintjs/core'
import { toaster, showSuccessToast, showErrorToast } from './AppToaster'
import getQuote from '../domain/quote'
import executeTrade from '../domain/trade'
import { isValidQuantity, MIN_QUANTITY, MAX_QUANTITY } from '../domain/quantity'
import { isUSDXSufficient } from '../domain/balance'
import { centsPerUSD } from '../../common/constants'
import { formatDollarValue } from './formatters'
import { marketDataSubscriber } from '../domain/market-data'
import { QuoteResponse } from '../../global-shared/types/server'
import './Trade.css'

interface TradeProps {
  onDeposit: Function
}

interface TradeState {
  isPulsingQuantity: boolean,
  secondsRemaining: number,
  quantityStr: string,
  assetSymbol: string,
  currentPrice: number,
  quantity?: number,
  quote?: QuoteResponse
}

const initialState: TradeState = {
  isPulsingQuantity: false,
  secondsRemaining: 0,
  quantityStr: '',
  assetSymbol: 'BTC',
  currentPrice: marketDataSubscriber.currentPrice,
  quote: undefined,
  quantity: undefined
}

class Trade extends React.Component<TradeProps, TradeState> {
  constructor (props: TradeProps) {
    super(props)
    this.state = initialState
  }

  get usdQuantity (): number {
    const {
      quantityStr,
      currentPrice
    } = this.state

    const usdQuantity = currentPrice * parseFloat(quantityStr)

    if (!isNaN(usdQuantity) && usdQuantity > 0) {
      return usdQuantity
    }

    return 0
  }

  get isQuoteValid (): boolean {
    return Boolean(this.state.quote)
  }

  onData = () => {
    const { currentPrice } = marketDataSubscriber
    this.setState({ currentPrice })
  }

  componentWillUnmount (): void {
    marketDataSubscriber.removeListener('update', this.onData)
  }

  componentDidMount (): void {
    marketDataSubscriber.on('update', this.onData)
  }

  confirmBuy = async () => {
    const {
      quantity,
      quote
    } = this.state

    if (this.isQuoteValid) {
      this.setState(initialState)
      this.setState({ currentPrice: marketDataSubscriber.currentPrice })

      if (quantity == null || quote == null) {
        return
      }

      try {
        await executeTrade(quantity, quote)
      } catch (e) {
        showErrorToast('Failed to execute trade: ' + e.message)
        return
      }

      showSuccessToast('Trade completed')
    }
  }

  countdown (): void {
    setTimeout(() => {
      if (!this.isQuoteValid) {
        return // likely means the quote was already executed
      }

      const secondsRemaining = this.state.secondsRemaining - 1

      if (secondsRemaining <= 0) {
        showErrorToast(`Price expired, please make another request.`)
        this.setState({
          secondsRemaining,
          quote: undefined
        })
      } else {
        this.setState({ secondsRemaining })
        this.countdown()
      }
    }, 1000)
  }

  handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    this.cancelQuote()
  }

  cancelQuote = () => {
    this.setState({
      quote: undefined
    })
  }

  startBuy = async (event: React.FormEvent) => {
    event.preventDefault()
    const quantity = parseFloat(this.state.quantityStr)

    if (!isValidQuantity(quantity)) {
      this.setState({ isPulsingQuantity: true })
      setTimeout(() => this.setState({ isPulsingQuantity: false }), 1000)
      if (quantity < MIN_QUANTITY) {
        showErrorToast(`Minimum quantity is ${MIN_QUANTITY} BTC`)
      } else if (quantity > MAX_QUANTITY) {
        showErrorToast(`Maximum quantity is ${MAX_QUANTITY} BTC`)
      } else {
        showErrorToast(`Invalid BTC quantity`)
      }
      return
    }

    if (!isUSDXSufficient(this.state.currentPrice * quantity)) {
      toaster.show({
        intent: 'danger',
        message: `Insufficient USD to purchase ${quantity} ${this.state.assetSymbol}`,
        action: {
          onClick: () => this.props.onDeposit(),
          text: 'Deposit'
        }
      })
      return
    }

    try {
      const quote = await getQuote(quantity)
      this.setState({
        quantity,
        quote,
        secondsRemaining: quote.duration
      })
      this.countdown()
    } catch (e) {
      showErrorToast('Failed to get price: ' + e.message)
    }
  }

  maybeRenderCoundown (): ReactNode {
    if (!this.isQuoteValid) {
      return
    }

    const seconds = this.state.secondsRemaining === 1 ? 'second' : 'seconds'

    return <span className='seconds-remaining'>Expires in {this.state.secondsRemaining} {seconds}</span>
  }

  renderSubmitButton (): ReactNode {
    if (!this.isQuoteValid || !this.state.quote) {
      return (
        <div className="button-container">
          <pre className="conversion">= {formatDollarValue(this.usdQuantity)}</pre>
          <Button className="buy" type="submit" icon="layers" fill={true}>Buy {this.state.assetSymbol}</Button>
        </div>
      )
    }

    const totalCost = formatDollarValue(this.state.quote.sourceAmount.value / centsPerUSD)

    return (
      <div className="button-container">
        <Button className="confirm-buy" onClick={this.confirmBuy} icon="layers" fill={true}>Buy for {totalCost}</Button>
        <Button minimal={true} onClick={this.handleCancel}>Cancel</Button>
      </div>
    )
  }

  render (): ReactNode {
    const { quantityStr, assetSymbol } = this.state
    const placeholder = '0.000'
    const inputStr = quantityStr || placeholder
    // Count periods as 0.5 of normal character length
    const inputLength = inputStr.length - (inputStr.split('.').length - 1) * 0.5
    const padding = Math.max(118 - inputLength * 10, 5)

    return (
      <div className="Trade">
        <div className="bp3-overlay-backdrop" style={{ display: this.isQuoteValid ? 'block' : 'none' }}></div>
        <form action="#" onSubmit={this.startBuy} className={this.isQuoteValid ? 'quoted' : ''}>
          {this.maybeRenderCoundown()}
          <FormGroup className="TradeForm">
            <NumericInput
              className={this.state.isPulsingQuantity ? 'PulseRed' : ''}
              fill={true}
              buttonPosition="none"
              value={quantityStr}
              placeholder={placeholder}
              rightElement={<H6 style={{ paddingRight: `${padding}px` }}>{assetSymbol}</H6>}
              onValueChange={(_, quantityStr) => this.setState({ quantityStr })}
              disabled={this.isQuoteValid}
            />
          </FormGroup>
          {this.renderSubmitButton()}
        </form>
      </div>
    )
  }
}

export default Trade
