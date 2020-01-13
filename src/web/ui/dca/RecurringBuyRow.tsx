import { RecurringBuy } from '../../../common/types'
import React, { ReactNode } from 'react'
import { getNextTimeoutDuration } from '../../../common/utils'
import { removeRecurringBuy } from '../../domain/main-request'
import { showErrorToast, showSuccessToast } from '../AppToaster'
import { Button, PopoverInteractionKind, Tooltip } from '@blueprintjs/core'
import { addMutedSpan, formatAmount, formatTimeUnit } from '../formatters'
import { Asset } from '../../../global-shared/types'
import { getCheckBuysTimeoutDuration } from '../../domain/dca'

interface RecurringBuyRowProps {
  recurringBuy: RecurringBuy
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

  render (): ReactNode {
    const { recurringBuy } = this.props
    const { timeoutDuration } = this.state

    const displayTimeUnit = formatTimeUnit(recurringBuy.frequency)
    const displayTime = `${recurringBuy.frequency.interval} ${displayTimeUnit}`

    const { asset } = recurringBuy.amount
    const amountBtc = asset === Asset.BTC ? addMutedSpan(formatAmount(recurringBuy.amount)) : 'Market'
    const amountUsd = asset === Asset.USDX ? addMutedSpan(formatAmount(recurringBuy.amount).slice(1)) : 'Market'

    const btcClassName = asset === Asset.BTC ? 'trade-amount btc' : ''
    const usdClassName = asset === Asset.USDX ? 'trade-amount usd' : ''

    const nextBuyDate = new Date(Date.now() + timeoutDuration)
    const nextBuyText = <span>Next buy: {nextBuyDate.toLocaleDateString()} at {nextBuyDate.toLocaleTimeString()}</span>

    const nextBuyTooltip = (
      <Tooltip content={nextBuyText} interactionKind={PopoverInteractionKind.HOVER} boundary='window'>
        {displayTime}
      </Tooltip>
    )

    return (
      <tr key={recurringBuy.id}>
        <td className={btcClassName}>{amountBtc}</td>
        <td className={usdClassName}>{amountUsd}</td>
        <td>{nextBuyTooltip}{this.renderRemoveButton(recurringBuy.id)}</td>
      </tr>
    )
  }
}
