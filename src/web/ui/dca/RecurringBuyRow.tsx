import { RecurringBuy } from '../../../common/types'
import React, { ReactNode } from 'react'
import { getNextTimeoutDuration } from '../../../common/utils'
import { removeRecurringBuy } from '../../domain/main-request'
import { showErrorToast, showSuccessToast } from '../AppToaster'
import { Button, PopoverInteractionKind, Tooltip, Spinner } from '@blueprintjs/core'
import {
  addMutedSpan,
  formatFrequency,
  formatDate,
  formatTime
} from '../formatters'
import { Asset } from '../../../global-shared/types'
import { getCheckBuysTimeoutDuration } from '../../domain/dca'
import { formatAmount } from '../../../common/formatters'

interface RecurringBuyRowProps {
  recurringBuy: RecurringBuy,
  isExecuting: boolean
}

interface RecurringBuyRowState {
  timeoutDuration: number
}

export class RecurringBuyRow extends React.Component<RecurringBuyRowProps, RecurringBuyRowState> {
  timeoutId?: NodeJS.Timeout

  constructor (props: RecurringBuyRowProps) {
    super(props)
    this.state = {
      timeoutDuration: 0
    }
  }

  componentDidMount (): void {
    this.updateTimeoutId()
  }

  componentWillUnmount (): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }

  updateTimeoutId = (): void => {
    this.updateTimeoutDuration()
    this.timeoutId = setTimeout(this.updateTimeoutId, getCheckBuysTimeoutDuration())
  }

  updateTimeoutDuration = (): void => {
    const { recurringBuy } = this.props
    const timeoutDuration = getNextTimeoutDuration(recurringBuy.frequency, new Date(), recurringBuy.referenceTime)
    this.setState({ timeoutDuration })
  }

  handleRemoveRecurringBuy = async (id: number): Promise<void> => {
    try {
      await removeRecurringBuy(id)
      showSuccessToast('Removed recurring buy')
    } catch (e) {
      showErrorToast(`Failed to remove recurring buy: ${e.message}`)
    }
  }

  renderRemoveButton (id: number): ReactNode {
    return <Button
      className='remove-icon'
      icon='cross'
      small
      minimal
      onClick={() => this.handleRemoveRecurringBuy(id)}
    />
  }

  renderRemoveOrSpinner (id: number): ReactNode {
    if (this.props.isExecuting) {
      return <Spinner size={12} />
    }

    return this.renderRemoveButton(id)
  }

  render (): ReactNode {
    const { recurringBuy } = this.props
    const { asset } = recurringBuy.amount
    const { timeoutDuration } = this.state

    const displayTime = `every ${formatFrequency(recurringBuy.frequency)}`

    const className = asset === Asset.BTC ? 'trade-amount btc' : 'trade-amount usd'
    const formattedAmount = formatAmount(recurringBuy.amount, { includeAsset: asset === Asset.BTC })
    // slice off the dollar symbol since we do that in css
    const mutedAsset = addMutedSpan(formattedAmount.slice(asset === Asset.USDX ? 1 : 0))

    const nextBuyDate = new Date(Date.now() + timeoutDuration)
    const nextBuyText = <span>Next buy: {formatDate(nextBuyDate)} at {formatTime(nextBuyDate)}</span>

    const nextBuyTooltip = (
      <Tooltip content={nextBuyText} interactionKind={PopoverInteractionKind.HOVER} boundary='window'>
        {displayTime}
      </Tooltip>
    )

    return (
      <tr key={recurringBuy.id}>
        <td className='dca-type'>Buy</td>
        <td className={className}>{mutedAsset}</td>
        <td className='dca-schedule'>{nextBuyTooltip}{this.renderRemoveOrSpinner(recurringBuy.id)}</td>
      </tr>
    )
  }
}
