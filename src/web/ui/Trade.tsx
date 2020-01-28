import React, { ReactNode } from 'react'
import {
  ButtonGroup,
  Button,
  AnchorButton,
  FormGroup,
  NumericInput,
  Intent,
  Classes,
  Switch,
  Tooltip
} from '@blueprintjs/core'
import {
  toaster,
  showSuccessToast,
  showErrorToast,
  showSupportToast,
  showLoadingToast
} from './AppToaster'
import { requestQuote, getQuoteUserDuration } from '../domain/quote'
import executeTrade from '../domain/trade'
import { validateQuantity } from '../domain/quantity'
import { altAmount } from '../domain/convert-amount'
import { formatAsset, getAltAmount } from './formatters'
import { marketDataSubscriber } from '../domain/market-data'
import { Amount, Asset } from '../../global-shared/types'
import { BalanceError, QuantityError } from '../../common/errors'
import { Quote } from '../../common/types'
import { toCommon } from '../../common/currency-conversions'
import { formatAmount } from '../../common/formatters'
import './Trade.css'

interface TradeProps {
  onDeposit: Function
}

interface TradeState {
  isPulsingQuantity: boolean,
  secondsRemaining: number,
  quantityStr: string,
  quantity?: Amount,
  asset: Asset,
  currentPrice: number | null,
  quote?: Quote
}

const initialState: TradeState = {
  isPulsingQuantity: false,
  secondsRemaining: 0,
  quantityStr: '',
  quantity: undefined,
  asset: Asset.USDX,
  currentPrice: marketDataSubscriber.currentPrice,
  quote: undefined
}

class Trade extends React.Component<TradeProps, TradeState> {
  constructor (props: TradeProps) {
    super(props)
    this.state = initialState
  }

  get altAmount (): Amount {
    const {
      quantity,
      quantityStr,
      asset,
      currentPrice
    } = this.state

    if (this.isQuoteValid && quantity && currentPrice) {
      return altAmount(quantity, currentPrice)
    }

    return getAltAmount(asset, quantityStr, currentPrice)
  }

  get isQuoteValid (): boolean {
    return Boolean(this.state.quote)
  }

  onData = (): void => {
    const { currentPrice } = marketDataSubscriber
    this.setState({ currentPrice })
  }

  pulseQuantity (): void {
    this.setState({ isPulsingQuantity: true })
    setTimeout(() => this.setState({ isPulsingQuantity: false }), 1000)
  }

  focus (): void {
    const input: HTMLElement | null = document.querySelector('.quantity input')
    if (input) {
      input.focus()
    }
  }

  escape = (event: KeyboardEvent): void => {
    if (event.keyCode === 27 && this.isQuoteValid) {
      this.cancelQuote()
    }
  }

  componentWillUnmount (): void {
    document.removeEventListener('keydown', this.escape, false)
    marketDataSubscriber.removeListener('update', this.onData)
  }

  componentDidMount (): void {
    document.addEventListener('keydown', this.escape, false)
    marketDataSubscriber.on('update', this.onData)
    this.focus()
  }

  confirmBuy = async (): Promise<void> => {
    const {
      quote,
      asset
    } = this.state

    if (this.isQuoteValid) {
      this.setState(Object.assign(initialState, {
        currentPrice: marketDataSubscriber.currentPrice,
        asset
      }))

      process.nextTick(() => this.focus())

      if (quote == null) {
        return
      }

      const dismissToast = showLoadingToast('Executing trade')

      try {
        await executeTrade(quote)
        showSuccessToast('Trade completed')
      } catch (e) {
        showSupportToast('Failed to execute trade: ' + e.message)
      } finally {
        dismissToast()
      }
    }
  }

  countdown (): void {
    setTimeout(() => {
      if (!this.isQuoteValid) {
        return // likely means the quote was already executed
      }

      const secondsRemaining = this.state.secondsRemaining - 1

      if (secondsRemaining <= 0) {
        showErrorToast(`Price expired, please make another request`)
        this.setState({
          secondsRemaining,
          quote: undefined
        })
        this.focus()
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
    this.focus()
  }

  switchAsset = (): void => {
    this.setState({
      asset: this.altAmount.asset,
      quantity: this.state.quantity && this.state.currentPrice !== null
        ? this.altAmount
        : undefined,
      quantityStr: this.state.quantityStr && this.state.currentPrice !== null
        ? toCommon(this.altAmount.asset, this.altAmount.value).toString()
        : ''
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
    const {
      asset,
      quantityStr,
      currentPrice
    } = this.state

    try {
      if (currentPrice == null) {
        throw new Error('Unable to execute trade before prices load')
      }

      const quantity = validateQuantity(asset, parseFloat(quantityStr), currentPrice)

      const quote = await requestQuote(quantity)
      const secondsRemaining = getQuoteUserDuration(quote)
      this.setState({
        quantity,
        quote,
        secondsRemaining
      })
      this.countdown()
    } catch (e) {
      if (e instanceof BalanceError) {
        this.showDepositError(e.message)
      } else if (e instanceof QuantityError) {
        showErrorToast(e.message)
        this.pulseQuantity()
      } else {
        showSupportToast(e.message)
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
    const {
      quote,
      quantity
    } = this.state

    if (!this.isQuoteValid || !quote || !quantity) {
      const { quantityStr, currentPrice } = this.state

      const shouldUseSkeleton = currentPrice === null && quantityStr !== ''
      const conversionClassName = shouldUseSkeleton ? Classes.SKELETON : ''

      return (
        <div className='button-container'>
          <div className='conversion'>
            = <span className={conversionClassName}>{formatAmount(this.altAmount)} {formatAsset(this.altAmount.asset)}</span>
          </div>
          <Button tabIndex={2} className='buy' type='submit' icon='layers' fill={true}>Buy BTC</Button>
        </div>
      )
    }

    const finalAmount = quantity.asset === Asset.BTC
      ? `Buy for ${formatAmount(quote.sourceAmount)}`
      : `Buy ${formatAmount(quote.destinationAmount)} BTC`

    return (
      <div className='button-container'>
        <Button tabIndex={2} className='confirm-buy' onClick={this.confirmBuy} icon='layers' fill={true}>{finalAmount}</Button>
        <Button tabIndex={3} minimal={true} onClick={this.handleCancel}>Cancel</Button>
      </div>
    )
  }

  render (): ReactNode {
    const { quantityStr, asset } = this.state
    const placeholder = '0.00'
    const inputStr = quantityStr || placeholder
    // Count periods as 0.5 of normal character length
    const inputLength = inputStr.length - (inputStr.split('.').length - 1) * 0.5
    const switchMargin = Math.max(78 - inputLength * 10, 0)
    const inputDollarLength = inputLength <= 8 ? inputLength * 12 : 96 + ((inputLength - 8) * 20)
    const dollarRight = Math.min(170 + (inputDollarLength), 320)

    return (
      <div className='Trade'>
        <div className='bp3-overlay-backdrop' style={{ display: this.isQuoteValid ? 'block' : 'none' }}></div>
        <ButtonGroup fill={true}>
          <Button active={true}>Buy</Button>
          <Tooltip content='Coming soon!'>
            <AnchorButton disabled={true}>Sell</AnchorButton>
          </Tooltip>
        </ButtonGroup>
        <form action='#' onSubmit={this.startBuy} className={this.isQuoteValid ? 'quoted' : ''}>
          {this.maybeRenderCoundown()}
          <FormGroup className='TradeForm'>
            <span className='quantity-label' style={{ right: `${dollarRight}px` }}>
              {asset === Asset.USDX ? '$' : '₿'}
            </span>
            <NumericInput
              tabIndex={1}
              className={`quantity ${asset} ${this.state.isPulsingQuantity ? 'PulseRed' : ''}`}
              fill={true}
              buttonPosition='none'
              value={quantityStr}
              placeholder={placeholder}
              rightElement={
                <Switch
                  tabIndex={4}
                  className='switch-asset'
                  large={true}
                  checked={asset === Asset.USDX}
                  innerLabel={formatAsset(Asset.BTC)}
                  innerLabelChecked={formatAsset(Asset.USDX)}
                  style={{ marginRight: `${switchMargin}px` }}
                  onChange={this.switchAsset}
                />
              }
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
