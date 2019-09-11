import React, { ReactNode } from 'react'
import {
  Button,
  FormGroup,
  NumericInput,
  H6,
  Intent,
  Classes
} from '@blueprintjs/core'
import { toaster, showSuccessToast, showErrorToast } from './AppToaster'
import getQuote from '../domain/quote'
import executeTrade from '../domain/trade'
import { isValidQuantity, MIN_QUANTITY, MAX_QUANTITY } from '../domain/quantity'
import { isUSDXSufficient, hasUSDX, getBalanceState } from '../domain/balance'
import { centsPerUSD } from '../../common/constants'
import { formatDollarValue } from './formatters'
import { marketDataSubscriber } from '../domain/market-data'
import { QuoteResponse } from '../../global-shared/types/server'
import { Asset } from '../../global-shared/types'
import './Trade.css'
import { delay } from '../../global-shared/util'

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
  currentPrice: 0,
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

    const dollars = currentPrice * parseFloat(quantityStr)
    // we apply ceil to reproduce the calculation done for quotes on the server
    const cents = Math.ceil(dollars * centsPerUSD)
    const usdQuantity = parseFloat((cents / centsPerUSD).toFixed(2))

    if (!isNaN(usdQuantity) && usdQuantity > 0) {
      return usdQuantity
    }

    return 0
  }

  get isQuoteValid (): boolean {
    return Boolean(this.state.quote)
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

  confirmBuy = async (): Promise<void> => {
    const {
      quantity,
      quote
    } = this.state

    if (this.isQuoteValid) {
      this.setState(Object.assign(initialState, {
        currentPrice: marketDataSubscriber.currentPrice
      }))

      if (quantity == null || quote == null) {
        return
      }

      try {
        await executeTrade(quantity, quote)
      } catch (e) {
        showErrorToast('Failed to execute trade: ' + e.message)
        return
      }

      getBalanceState(Asset.USDX)
      showSuccessToast('Trade completed')

      // This delay is necessary since LND doesn't update balance immediately after executeTrade
      await delay(50)
      getBalanceState(Asset.BTC)
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

  handleCancel = (e: React.MouseEvent): void => {
    e.preventDefault()
    this.cancelQuote()
  }

  cancelQuote = (): void => {
    this.setState({
      quote: undefined
    })
  }

  showDepositError (message: string): void {
    toaster.show({
      intent: Intent.DANGER,
      message,
      action: {
        onClick: () => this.props.onDeposit(),
        text: 'Deposit'
      }
    })
  }

  startBuy = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!marketDataSubscriber.hasLoadedCurrentPrice) {
      showErrorToast('Wait for prices to load before buying BTC.')
      return
    }

    const quantity = parseFloat(this.state.quantityStr)

    if (!hasUSDX()) {
      this.showDepositError(`Deposit USD before purchasing ${this.state.assetSymbol}`)
      return
    }

    if (!isValidQuantity(quantity)) {
      this.setState({ isPulsingQuantity: true })
      setTimeout(() => this.setState({ isPulsingQuantity: false }), 1000)
      if (quantity < MIN_QUANTITY || this.state.quantityStr === '') {
        const minQuantity = MIN_QUANTITY.toFixed(8)
        showErrorToast(`Minimum quantity is ${minQuantity} BTC`)
      } else if (quantity > MAX_QUANTITY) {
        const maxQuantity = MAX_QUANTITY.toFixed(8)
        showErrorToast(`Maximum quantity is ${maxQuantity} BTC`)
      } else {
        showErrorToast(`Invalid BTC quantity`)
      }
      return
    }

    if (!isUSDXSufficient(this.state.currentPrice * quantity)) {
      this.showDepositError(`Insufficient USD to purchase ${quantity} ${this.state.assetSymbol}`)
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
      if (e.statusCode === 403) {
        showErrorToast('Your account must be approved prior to trading.')
      } else {
        showErrorToast('Failed to get price: ' + e.message)
      }
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
      const { quantityStr } = this.state
      const { hasLoadedCurrentPrice } = marketDataSubscriber

      const shouldUseSkeleton = !(hasLoadedCurrentPrice || quantityStr === '')
      const conversionClassName = shouldUseSkeleton ? Classes.SKELETON : ''

      return (
        <div className="button-container">
          <pre className="conversion">
            = <span className={conversionClassName}>{formatDollarValue(this.usdQuantity)}</span>
          </pre>
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
