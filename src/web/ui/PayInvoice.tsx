import React, { ReactNode, ChangeEvent } from 'react'
import { payInvoice, getInvoice } from '../domain/lnd'
import { requestQuote, getQuoteUserDuration } from '../domain/quote'
import executeTrade from '../domain/trade'
import { handleLightningPaymentUri } from '../domain/main-request'
import { Button, Dialog, Classes, Label, TextArea, Switch, Spinner } from '@blueprintjs/core'
import { showErrorToast } from './AppToaster'
import logger from '../../global-shared/logger'
import { Asset, Unit, Amount, Nullable } from '../../global-shared/types'
import { SpinnerSuccess } from './components'
import { formatAsset } from './formatters'
import { isUSDXSufficient } from '../domain/balance'
import { Quote } from '../../common/types'
import { formatAmount } from '../../common/formatters'
import './PayInvoice.css'

interface PayInvoiceProps {
  onDeposit: Function
}

interface PayInvoiceState {
  isDialogOpen: boolean,
  paymentRequest: string,
  invoiceError: Nullable<string>,
  shouldBuyBtc: boolean,
  quote: Nullable<Quote>,
  btcAmount: Nullable<Amount>,
  isPaying: boolean,
  isPaid: boolean,
  secondsRemaining: number
}

const initialState: PayInvoiceState = {
  isDialogOpen: false,
  shouldBuyBtc: true,
  paymentRequest: '',
  quote: null,
  btcAmount: null,
  isPaying: false,
  isPaid: false,
  invoiceError: null,
  secondsRemaining: 0
}

class PayInvoice extends React.Component<PayInvoiceProps, PayInvoiceState> {
  constructor (props: PayInvoiceProps) {
    super(props)

    this.state = initialState
  }

  isPaymentRequestValid (paymentRequest: string): boolean {
    return this.state.paymentRequest === paymentRequest
  }

  isQuoteValid (paymentRequest: string, quote: Nullable<Quote>): boolean {
    return this.state.shouldBuyBtc && paymentRequest === this.state.paymentRequest && quote === this.state.quote
  }

  componentDidMount (): void {
    handleLightningPaymentUri(({ paymentRequest }: { paymentRequest: string }) => {
      this.addPaymentRequest(paymentRequest)
      this.setState({ isDialogOpen: true })
    })
  }

  async loadInvoice (paymentRequest: string): Promise<void> {
    this.setState({
      quote: null,
      btcAmount: null,
      secondsRemaining: 0,
      invoiceError: null
    })
    if (paymentRequest.length === 0) {
      return
    }

    try {
      const { numSatoshis } = await getInvoice(paymentRequest)
      // we want to make sure the payment request is still the same
      // so that we are associating the invoice amount with the correct payment request.
      if (this.isPaymentRequestValid(paymentRequest)) {
        const btcAmount = {
          asset: Asset.BTC,
          unit: Unit.Satoshi,
          value: parseInt(numSatoshis, 10)
        }
        this.setState({ btcAmount })

        if (this.state.shouldBuyBtc) {
          await this.loadQuote(paymentRequest, btcAmount)
        }
      }
    } catch (e) {
      this.setState({ invoiceError: e.message })
      logger.error('Error loading invoice: ' + e.message)
    }
  }

  async loadQuote (paymentRequest: string, btcAmount: Amount): Promise<void> {
    const quote = await requestQuote(btcAmount)

    // check that the user hasn't changed the payment request while we were
    // retrieving the quote so we associate the correct quote with the payment request.
    if (this.state.shouldBuyBtc && this.isPaymentRequestValid(paymentRequest)) {
      this.setState({
        quote,
        // this value won't be exact, but should be close enough
        secondsRemaining: getQuoteUserDuration(quote)
      })

      // timeout the quote
      setTimeout(() => this.countdown(paymentRequest, quote), 1000)
    }
  }

  countdown (paymentRequest: string, quote: Nullable<Quote>): void {
    if (this.isQuoteValid(paymentRequest, quote)) {
      const secondsRemaining = Math.max(this.state.secondsRemaining - 1, 0)
      this.setState({
        secondsRemaining
      })

      if (secondsRemaining > 0) {
        setTimeout(() => this.countdown(paymentRequest, quote), 1000)
      }
    }
  }

  refreshQuote = (): void => {
    const {
      paymentRequest,
      shouldBuyBtc
    } = this.state

    if (paymentRequest === '' || !shouldBuyBtc) {
      return
    }

    this.loadInvoice(paymentRequest)
  }

  addPaymentRequest (paymentRequest: string): void {
    try {
      this.setState({ paymentRequest })

      this.loadInvoice(paymentRequest)
    } catch (e) {
      showErrorToast(`Error parsing invoice: ${e.message}`)
    }
  }

  handleChange = (evt: ChangeEvent<HTMLTextAreaElement>): void => {
    this.addPaymentRequest(evt.target.value)
  }

  toggleBuyBtc = (): void => {
    // if we're switching to buying, we need to fetch a new invoice
    if (this.state.shouldBuyBtc) {
      this.setState({ quote: null })
    } else {
      this.loadInvoice(this.state.paymentRequest)
    }
    this.setState({ shouldBuyBtc: !this.state.shouldBuyBtc })
  }

  closeDialog = (): void => {
    this.setState(initialState)
  }

  payInvoice = async (): Promise<void> => {
    this.setState({ isPaying: true })
    try {
      if (this.state.paymentRequest === '') {
        throw new Error('Payment request cannot be blank')
      }

      if (this.state.shouldBuyBtc) {
        if (this.state.quote === null) {
          throw new Error(`Quote not loaded`)
        }
        const usdxAmount = this.state.quote.sourceAmount.asset === Asset.USDX
          ? this.state.quote.sourceAmount
          : this.state.quote.destinationAmount

        if (!isUSDXSufficient(usdxAmount.value)) {
          showErrorToast('Insufficient USD', {
            onClick: () => this.props.onDeposit(),
            text: 'Deposit'
          })
          this.setState({
            isPaying: false
          })
          return
        }

        await executeTrade(this.state.quote)
      }

      try {
        await payInvoice(this.state.paymentRequest)
        this.setState({ isPaid: true })
      } catch (e) {
        // don't want to re-buy when paying the same invoice
        this.setState({ shouldBuyBtc: false })
        throw e
      }
    } catch (e) {
      this.setState({ quote: null })
      this.loadInvoice(this.state.paymentRequest)
      showErrorToast(`Error paying invoice: ${e.message}`)
    } finally {
      this.setState({ isPaying: false })
    }
  }

  renderAmount (): string {
    const {
      shouldBuyBtc,
      quote,
      btcAmount
    } = this.state

    if (btcAmount === null) {
      return `Unknown ${formatAsset(Asset.BTC)}`
    }

    if (!shouldBuyBtc || !quote) {
      return `${formatAmount(btcAmount)} ${formatAsset(btcAmount.asset)}`
    }

    return `${formatAmount(quote.sourceAmount)} ${formatAsset(quote.sourceAmount.asset)}`
  }

  renderError (): ReactNode {
    const { invoiceError, paymentRequest } = this.state

    if (invoiceError === null || paymentRequest === '') {
      return
    }

    return (
      <span className='error'>Error: {invoiceError}</span>
    )
  }

  renderRefresh (): ReactNode {
    if (this.state.quote === null || this.state.paymentRequest === '' || this.state.isPaying || this.state.isPaid) {
      return
    }

    const btnText = this.state.secondsRemaining > 0
      ? `Expires in ${this.state.secondsRemaining} seconds`
      : 'Refresh USD amount'

    return (
      <Button
        minimal={true}
        text={btnText}
        onClick={this.refreshQuote}
      />
    )
  }

  renderBody (): ReactNode {
    const {
      paymentRequest,
      shouldBuyBtc,
      isPaying,
      btcAmount,
      quote,
      invoiceError,
      secondsRemaining
    } = this.state

    const hasInvoiceError = invoiceError !== null && paymentRequest !== ''
    const quoteIsExpired = quote !== null && secondsRemaining <= 0
    const loadingQuote = shouldBuyBtc && paymentRequest !== '' && quote === null
    const loadingInvoice = paymentRequest !== '' && btcAmount === null

    const isLoading = isPaying || (!hasInvoiceError && (loadingQuote || loadingInvoice))

    if (this.state.isPaid) {
      return (
        <React.Fragment>
          <div className={Classes.DIALOG_BODY}>
            <SpinnerSuccess
              size={Spinner.SIZE_LARGE}
            />
            <p>Your payment of {this.renderAmount()} was successful.</p>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                text='Done'
                fill={true}
                onClick={this.closeDialog}
              />
            </div>
          </div>
        </React.Fragment>
      )
    }

    return (
      <React.Fragment>
        <div className={Classes.DIALOG_BODY}>
          <p>Pay a Lightning Network invoice by pasting the generated payment request in the box below.</p>
          <Label>
            Payment Request
            <TextArea
              fill={true}
              growVertically={true}
              small={true}
              onChange={this.handleChange}
              value={paymentRequest}
              disabled={isPaying}
              placeholder='Paste payment request string here'
            />
          </Label>
          <div className='below-payment-request'>
            <Switch
              checked={shouldBuyBtc}
              onChange={this.toggleBuyBtc}
              label='Use USD'
            />
            {this.renderError()}
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button
            minimal={true}
            text='Return to app'
            onClick={this.closeDialog}
          />
          {this.renderRefresh()}
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text={btcAmount === null ? 'Send Payment' : `Send ${this.renderAmount()}`}
              fill={true}
              onClick={this.payInvoice}
              loading={isLoading}
              disabled={hasInvoiceError || quoteIsExpired}
            />
          </div>
        </div>
      </React.Fragment>
    )
  }

  render (): ReactNode {
    const {
      isDialogOpen
    } = this.state

    return (
      <React.Fragment>
        <Button
          small={true}
          onClick={() => this.setState({ isDialogOpen: true }) }
        >
          Send
        </Button>
        <Dialog
          isOpen={isDialogOpen}
          onClose={this.closeDialog}
          title='Pay Lightning Invoice'
          className='PayInvoice'
        >
          {this.renderBody()}
        </Dialog>
      </React.Fragment>
    )
  }
}

export default PayInvoice
