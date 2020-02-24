import React, { ReactNode } from 'react'
import {
  Card,
  H6,
  Tooltip,
  H5,
  IconName,
  Intent,
  Icon
} from '@blueprintjs/core'
import {
  Amount,
  Nullable
} from '../../../global-shared/types'
import {
  formatAmount,
  FormatOptions, sliceMiddle
} from '../../../common/formatters'
import {
  formatDate,
  formatTime
} from '../formatters'
import {
  DisplayValue,
  DisplayIcon,
  PulseColor
} from './DisplayValue'
import './TxCard.css'
import { ExternalLink } from '.'
import { getTxLink } from '../../domain/explorers'

const AMOUNT_OPTIONS = {
  includeAsset: true,
  includeSign: true
}

interface TitledAmount {
  amount: Amount,
  title?: string,
  options?: FormatOptions
}

export interface ExtraInfo {
  title: string,
  info: string,
  txId?: string
}

interface TxCardProps {
  icon: IconName,
  title: string,
  date: Date,
  amount: Amount,
  secondaryAmount: Amount | TitledAmount,
  className?: string,
  loading?: boolean,
  intent?: Intent,
  extraInfo?: ExtraInfo,
  pulseColor?: Nullable<PulseColor>,
  resetPulse?: () => void
}

function isTitledAmount (amount: Amount | TitledAmount): amount is TitledAmount {
  return Object.keys(amount).includes('amount')
}

function maybeRenderExternalLink (extraInfo: ExtraInfo): ReactNode {
  if (!extraInfo.txId) {
    return
  }

  return (
    <React.Fragment>
      <br />
      <ExternalLink href={getTxLink(extraInfo.txId)} className='tx-link'>
        {sliceMiddle(extraInfo.txId, 14)}
        <Icon icon='share' iconSize={14} />
      </ExternalLink>
    </React.Fragment>
  )
}

class TxCard extends React.Component<TxCardProps> {
  renderExtraInfo (): ReactNode {
    const { extraInfo } = this.props
    if (!extraInfo) return

    return (
      <React.Fragment>
        <span className='subtitle'>{extraInfo.title}</span>
        {extraInfo.info}
        {maybeRenderExternalLink(extraInfo)}
      </React.Fragment>
    )
  }

  renderSecondaryAmount (): string {
    const {
      secondaryAmount
    } = this.props

    if (!isTitledAmount(secondaryAmount)) {
      return formatAmount(secondaryAmount, AMOUNT_OPTIONS)
    }

    const {
      title,
      amount,
      options
    } = secondaryAmount

    // allow overriding of format options
    const formatOptions = Object.assign({}, AMOUNT_OPTIONS, options || {})

    const prefix = title ? `${title}: ` : ''

    return `${prefix}${formatAmount(amount, formatOptions)}`
  }

  get className (): string {
    const classes = ['transaction']

    if (this.props.className) {
      classes.push(this.props.className)
    }

    return classes.join(' ')
  }

  render (): ReactNode {
    return (
      <Card className={this.className}>
        <DisplayIcon
          icon={this.props.icon}
          pulseColor={this.props.pulseColor}
          loading={this.props.loading}
          intent={this.props.intent}
          className='subtitle'
        />
        <H5 className='transaction-type'>
          <DisplayValue
            pulseColor={this.props.pulseColor}
            resetPulse={this.props.resetPulse}
          >
            {this.props.title}
          </DisplayValue>
          <br />
          <Tooltip
            targetClassName='subtitle'
            content={`${formatDate(this.props.date)} ${formatTime(this.props.date)}`}
            boundary='window'
          >
            {formatDate(this.props.date)}
          </Tooltip>
        </H5>
        <H6 className='extra-info'>
          {this.renderExtraInfo()}
        </H6>
        <H6 className='amounts'>
          {formatAmount(this.props.amount, AMOUNT_OPTIONS)}
          <br />
          <span className='subtitle'>
            {this.renderSecondaryAmount()}
          </span>
        </H6>
      </Card>
    )
  }
}

export default TxCard
