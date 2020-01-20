import { Asset, Nullable } from '../../../global-shared/types'
import { Frequency, TimeUnit } from '../../../common/types'
import { marketDataSubscriber } from '../../domain/market-data'
import React, { ReactNode } from 'react'
import { showErrorToast, showSuccessToast } from '../AppToaster'
import { toAmount, toCommon, validateQuantity } from '../../domain/quantity'
import { getCronDate, getNextTimeoutDuration } from '../../../common/utils'
import { addRecurringBuy } from '../../domain/main-request'
import { formatAmount, formatAsset, getAltAmount } from '../formatters'
import { Button, ButtonGroup, Callout, Classes, Dialog, H5, HTMLTable, Icon } from '@blueprintjs/core'
import { FormField } from '../Onboarding/form-field'

const PLACEHOLDER_INTERVAL = 1
const NUM_IMPLIED_BUYS = 3

interface DCADialogProps {
  isOpen: boolean,
  onClose: Function
}

interface DCADialogState {
  quantityStr: string,
  asset: Asset,
  intervalStr: string,
  timeUnit: TimeUnit,
  currentPrice: Nullable<number>,
  isLoading: boolean
}

const initialState: DCADialogState = {
  quantityStr: '',
  asset: Asset.USDX,
  intervalStr: '',
  timeUnit: TimeUnit.HOURS,
  currentPrice: marketDataSubscriber.currentPrice,
  isLoading: false
}

export class DCADialog extends React.Component<DCADialogProps, DCADialogState> {
  constructor (props: DCADialogProps) {
    super(props)
    this.state = initialState
  }

  onData = (): void =>
    this.setState({ currentPrice: marketDataSubscriber.currentPrice })

  componentDidMount (): void {
    marketDataSubscriber.on('update', this.onData)
  }

  resetState = (): void => {
    this.setState(Object.assign(initialState, {
      currentPrice: marketDataSubscriber.currentPrice
    }))
  }

  onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    const {
      asset,
      quantityStr,
      intervalStr,
      timeUnit,
      currentPrice
    } = this.state

    if (!quantityStr || !intervalStr) {
      showErrorToast('Must select an amount and interval')
      return
    }

    if (currentPrice == null) {
      showErrorToast('Unable to submit recurring buy before prices load')
      return
    }

    const amount = validateQuantity(asset, parseFloat(quantityStr), currentPrice)

    const frequency: Frequency = {
      unit: timeUnit,
      interval: parseInt(intervalStr, 10)
    }

    const referenceTime = getCronDate(new Date())

    try {
      this.setState({ isLoading: true })
      await addRecurringBuy({ frequency, amount, referenceTime })
      this.resetState()
      showSuccessToast('Added recurring buy')
      this.props.onClose()
    } catch (e) {
      showErrorToast(e.message)
    } finally {
      this.setState({ isLoading: false })
    }
  }

  onChange = (name: keyof DCADialogState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void =>
      this.setState({ ...this.state, [name]: event.target.value })

  switchAsset = (): void => {
    const { asset, quantityStr, currentPrice } = this.state
    const altAmount = getAltAmount(asset, quantityStr, currentPrice)

    this.setState({
      asset: altAmount.asset,
      quantityStr: this.state.quantityStr && this.state.currentPrice != null
        ? toCommon(altAmount.asset, altAmount.value).toString()
        : ''
    })
  }

  renderImpliedNextBuys (): ReactNode {
    const { intervalStr, timeUnit: unit } = this.state
    const interval = parseInt(intervalStr, 10) || PLACEHOLDER_INTERVAL
    if (!interval || !unit) {
      return null
    }

    const amount = toAmount(this.state.asset, parseFloat(this.state.quantityStr || '0'))
    const displayAmount = formatAmount(amount)

    const referenceTime = getCronDate(new Date())

    const nextBuyDates: Date[] = []

    let lastBuyDate = referenceTime
    for (let i = 0; i < NUM_IMPLIED_BUYS; i++) {
      const duration = getNextTimeoutDuration({ interval, unit }, lastBuyDate, referenceTime)
      lastBuyDate = new Date(lastBuyDate.getTime() + duration)
      nextBuyDates.push(lastBuyDate)
    }

    return (
      <div className='upcoming-buys'>
        <H5>Next {NUM_IMPLIED_BUYS} buys</H5>
        <HTMLTable condensed>
          <thead>
            <tr>
              <th>Amount ({formatAsset(this.state.asset)})</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody className={this.state.intervalStr ? '' : 'placeholder'}>
            {nextBuyDates.map((nextBuyDate: Date, i: number) => {
              const date = nextBuyDate.toLocaleDateString()
              const time = nextBuyDate.toLocaleTimeString()

              return (
                <tr key={i}>
                  <td>{displayAmount}</td>
                  <td>{date}</td>
                  <td>{time}</td>
                </tr>
              )
            })}
          </tbody>
        </HTMLTable>
      </div>
    )
  }

  render (): ReactNode {
    const { isOpen } = this.props
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog className='dca-dialog' title='Add Recurring Buy' isOpen={isOpen} onClose={onClose}>
        <form action='#' onSubmit={this.onSubmit}>
          <div className={Classes.DIALOG_BODY}>
            <div className='amount-row'>
              <FormField
                autoFocus
                formId='amount'
                label='Amount'
                placeholder={this.state.asset === Asset.BTC ? '0.00000000' : '0.00'}
                value={this.state.quantityStr}
                validator={quantityStr => parseFloat(quantityStr) > 0}
                onChange={this.onChange('quantityStr')}
              />
              <ButtonGroup className='select-asset'>
                <Button
                  text='USD'
                  onClick={() => this.state.asset === Asset.BTC && this.switchAsset()}
                  active={this.state.asset === Asset.USDX}
                />
                <Button
                  text='BTC'
                  onClick={() => this.state.asset === Asset.USDX && this.switchAsset()}
                  active={this.state.asset === Asset.BTC}
                />
              </ButtonGroup>
            </div>
            <div className="schedule-row">
              <FormField
                formId='interval'
                label='Every'
                value={this.state.intervalStr}
                onChange={this.onChange('intervalStr')}
                placeholder={PLACEHOLDER_INTERVAL.toString(10)}
              />
              <ButtonGroup className='select-time-unit'>
                <Button
                  text={TimeUnit.HOURS.toLowerCase()}
                  onClick={() => this.setState({ timeUnit: TimeUnit.HOURS })}
                  active={this.state.timeUnit === TimeUnit.HOURS}
                />
                <Button
                  text={TimeUnit.DAYS.toLowerCase()}
                  onClick={() => this.setState({ timeUnit: TimeUnit.DAYS })}
                  active={this.state.timeUnit === TimeUnit.DAYS}
                />
                <Button
                  text={TimeUnit.WEEKS.toLowerCase()}
                  onClick={() => this.setState({ timeUnit: TimeUnit.WEEKS })}
                  active={this.state.timeUnit === TimeUnit.WEEKS}
                />
                <Button
                  text={TimeUnit.MONTHS.toLowerCase()}
                  onClick={() => this.setState({ timeUnit: TimeUnit.MONTHS })}
                  active={this.state.timeUnit === TimeUnit.MONTHS}
                />
              </ButtonGroup>
            </div>
            {this.renderImpliedNextBuys()}
            <Callout className='bp3-callout-icon'>
              <Icon icon='info-sign' iconSize={Icon.SIZE_STANDARD} />
              <H5>Pauses When App Is Closed</H5>
              Since Sparkswap doesn&apos;t custody funds, buys only execute while the app is running.
            </Callout>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                type='submit'
                text='Create Recurring Buy'
                fill={true}
                loading={this.state.isLoading}
              />
            </div>
          </div>
        </form>
      </Dialog>
    )
  }
}
