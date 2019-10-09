import React, { ReactNode } from 'react'
import {
  Button,
  FormGroup,
  NumericInput,
  Intent,
  Classes,
  Switch
} from '@blueprintjs/core'
import { toaster, showSuccessToast, showErrorToast } from './AppToaster'
import { getQuote } from '../domain/quote'
import executeTrade from '../domain/trade'
import {
  isValidQuantity,
  isValidAmount,
  toQuantum,
  toCommon,
  MIN_AMOUNT,
  MAX_AMOUNT,
  MIN_QUANTITY,
  MAX_QUANTITY
} from '../domain/quantity'
import { isUSDXSufficient, getBalanceState, balances } from '../domain/balance'
import { centsPerUSD, satoshisPerBTC } from '../../common/constants'
import { formatAmount, formatAsset } from './formatters'
import { marketDataSubscriber } from '../domain/market-data'
import { QuoteResponse } from '../../global-shared/types/server'
import { Amount, Asset, assetToUnit } from '../../global-shared/types'
import './Trade.css'
import { delay } from '../../global-shared/util'

interface TradeProps {
  onDeposit: Function
}

interface TradeState {
  isPulsingQuantity: boolean,
  secondsRemaining: number,
  quantityStr: string,
  quantity?: Amount,
  asset: Asset,
  currentPrice: number,
  quote?: QuoteResponse
}

const initialState: TradeState = {
  isPulsingQuantity: false,
  secondsRemaining: 0,
  quantityStr: '',
  quantity: undefined,
  asset: Asset.USDX,
  currentPrice: 0,
  quote: undefined
}

function altAsset (asset: Asset): Asset {
  if (asset === Asset.BTC) return Asset.USDX
  return Asset.BTC
}

function altValue (startAsset: Asset, startValue: number, currentPrice: number): number {
  const quantumPrice = currentPrice * centsPerUSD / satoshisPerBTC

  // The server will round cents in their favor, so we simulate that here
  if (startAsset === Asset.BTC) return Math.ceil(startValue * quantumPrice)
  return Math.floor(startValue / quantumPrice)
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

    if (this.isQuoteValid && quantity) {
      return {
        asset: altAsset(quantity.asset),
        unit: assetToUnit(altAsset(quantity.asset)),
        value: altValue(quantity.asset, quantity.value, currentPrice)
      }
    }

    return {
      asset: altAsset(asset),
      unit: assetToUnit(altAsset(asset)),
      value: parseFloat(quantityStr) > 0
        ? altValue(asset, toQuantum(asset, parseFloat(quantityStr)), currentPrice)
        : 0
    }
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

  focus (): void {
    const input: HTMLElement | null = document.querySelector('.quantity input')
    if (input) {
      input.focus()
    }
  }

  componentDidMount (): void {
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

      try {
        await executeTrade(quote)
      } catch (e) {
        showErrorToast('Failed to execute trade: ' + e.message)
        return
      }

      // This delay is necessary since LND doesn't update balance immediately after executeTrade
      await delay(200)
      showSuccessToast('Trade completed')
      getBalanceState(Asset.USDX)
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
  }

  switchAsset = (): void => {
    this.setState({
      asset: this.altAmount.asset,
      quantity: this.state.quantity && marketDataSubscriber.hasLoadedCurrentPrice
        ? this.altAmount
        : undefined,
      quantityStr: this.state.quantityStr && marketDataSubscriber.hasLoadedCurrentPrice
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

  validateQuantity (): number | null {
    const { asset, quantityStr } = this.state
    const quantity = parseFloat(quantityStr)

    if (isValidQuantity(asset, quantity) && isValidAmount(this.altAmount)) {
      return quantity
    }

    this.setState({ isPulsingQuantity: true })
    setTimeout(() => this.setState({ isPulsingQuantity: false }), 1000)

    if (quantity < MIN_QUANTITY[asset] || quantityStr === '') {
      showErrorToast(`Minimum quantity is ${formatAmount(MIN_AMOUNT[asset])} ${formatAsset(asset)}`)
    } else if (quantity > MAX_QUANTITY[asset]) {
      showErrorToast(`Maximum quantity is ${formatAmount(MAX_AMOUNT[asset])} ${formatAsset(asset)}`)
    } else if (this.altAmount.value < MIN_AMOUNT[this.altAmount.asset].value) {
      showErrorToast(`Minimum quantity is ${formatAmount(MIN_AMOUNT[this.altAmount.asset])} ${formatAsset(this.altAmount.asset)}`)
    } else if (this.altAmount.value > MAX_AMOUNT[this.altAmount.asset].value) {
      showErrorToast(`Maximum quantity is ${formatAmount(MAX_AMOUNT[this.altAmount.asset])} ${formatAsset(this.altAmount.asset)}`)
    } else {
      showErrorToast(`Invalid ${formatAsset(asset)} quantity`)
    }

    return null
  }

  startBuy = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!marketDataSubscriber.hasLoadedCurrentPrice) {
      showErrorToast(`Wait for prices to load before buying BTC`)
      return
    }

    const usdBalance = balances[Asset.USDX]

    if (usdBalance instanceof Error) {
      showErrorToast(`Wait for USD balance to load before buying BTC`)
      return
    } else if (usdBalance.value === 0) {
      this.showDepositError(`Deposit USD before buying BTC`)
      return
    }

    const asset = this.state.asset
    const value = this.validateQuantity()
    if (value == null) return

    const quantity = {
      asset,
      unit: assetToUnit(asset),
      value: toQuantum(asset, value)
    }

    const usdxQuantity = asset === Asset.USDX
      ? quantity.value
      : altValue(asset, quantity.value, this.state.currentPrice)

    if (!isUSDXSufficient(usdxQuantity)) {
      this.showDepositError(`Insufficient USD`)
      return
    }

    try {
      const quote = await getQuote(quantity)
      // subtract 5 seconds from the quote duration because if the user clicks
      // the confirm button right before the countdown hits zero, we still have
      // to make a network round trip before the client's invoice gets an HTLC,
      // and this invoice's expiration is set based on the quote duration.
      const secondsRemaining = Math.max(quote.duration - 5, 1)
      this.setState({
        quantity,
        quote,
        secondsRemaining
      })
      this.countdown()
    } catch (e) {
      if (e.statusCode === 403) {
        showErrorToast('Your account must be approved prior to trading')
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
    const {
      quote,
      quantity
    } = this.state

    if (!this.isQuoteValid || !quote || !quantity) {
      const { quantityStr } = this.state
      const { hasLoadedCurrentPrice } = marketDataSubscriber

      const shouldUseSkeleton = !(hasLoadedCurrentPrice || quantityStr === '')
      const conversionClassName = shouldUseSkeleton ? Classes.SKELETON : ''

      return (
        <div className="button-container">
          <div className="conversion">
            = <span className={conversionClassName}>{formatAmount(this.altAmount)} {formatAsset(this.altAmount.asset)}</span>
          </div>
          <Button tabIndex={2} className="buy" type="submit" icon="layers" fill={true}>Buy BTC</Button>
        </div>
      )
    }

    const finalAmount = quantity.asset === Asset.BTC
      ? `Buy for ${formatAmount(quote.sourceAmount)}`
      : `Buy ${formatAmount(quote.destinationAmount)} BTC`

    return (
      <div className="button-container">
        <Button tabIndex={2} className="confirm-buy" onClick={this.confirmBuy} icon="layers" fill={true}>{finalAmount}</Button>
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
      <div className="Trade">
        <div className="bp3-overlay-backdrop" style={{ display: this.isQuoteValid ? 'block' : 'none' }}></div>
        <form action="#" onSubmit={this.startBuy} className={this.isQuoteValid ? 'quoted' : ''}>
          {this.maybeRenderCoundown()}
          <FormGroup className="TradeForm">
            <span className='quantity-label' style={{ right: `${dollarRight}px` }}>
              {asset === Asset.USDX ? '$' : '₿'}
            </span>
            <NumericInput
              tabIndex={1}
              className={`quantity ${asset} ${this.state.isPulsingQuantity ? 'PulseRed' : ''}`}
              fill={true}
              buttonPosition="none"
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
