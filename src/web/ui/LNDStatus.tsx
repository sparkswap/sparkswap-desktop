import React, { ReactNode } from 'react'
import {
  Button,
  Intent,
  Spinner
} from '@blueprintjs/core'
import { StatusBadge } from './components'
import * as lnd from '../domain/lnd'
import './LNDStatus.css'

interface LNDStatusProps {
  status: lnd.Statuses,
  loading: boolean,
  onClick: Function
}

const STATUS_TEXT = Object.freeze({
  [lnd.Statuses.UNKNOWN]: 'LND is unreachable',
  [lnd.Statuses.NO_CONFIG]: 'Sparkswap is not configured',
  [lnd.Statuses.LOCKED]: 'LND is locked',
  [lnd.Statuses.NEEDS_WALLET]: 'LND is not setup',
  [lnd.Statuses.UNAVAILABLE]: 'LND is unreachable',
  [lnd.Statuses.UNLOCKED]: 'LND is syncing',
  [lnd.Statuses.NOT_SYNCED]: 'LND is syncing',
  [lnd.Statuses.VALIDATED]: 'Connected to LND'
})

const ERROR_STATUS = [
  lnd.Statuses.UNKNOWN,
  lnd.Statuses.UNAVAILABLE
]

const SYNCING_STATUS = [
  lnd.Statuses.UNLOCKED,
  lnd.Statuses.NOT_SYNCED
]

class LNDStatus extends React.Component<LNDStatusProps, {}> {
  get buttonIntent (): Intent {
    if (this.props.loading || this.props.status === lnd.Statuses.VALIDATED || SYNCING_STATUS.includes(this.props.status)) {
      return Intent.NONE
    }

    if (ERROR_STATUS.includes(this.props.status)) {
      return Intent.DANGER
    }

    return Intent.WARNING
  }

  get statusIntent (): Intent {
    if (this.props.status === lnd.Statuses.VALIDATED) {
      return Intent.SUCCESS
    }

    if (ERROR_STATUS.includes(this.props.status)) {
      return Intent.DANGER
    }

    return Intent.WARNING
  }

  get className (): string {
    return [
      'settings-button',
      this.props.loading ? 'loading' : ''
    ].filter(Boolean).join(' ')
  }

  renderText (): ReactNode {
    if (this.props.loading) {
      return 'Connecting to LND'
    }
    return STATUS_TEXT[this.props.status]
  }

  renderBadge (): ReactNode {
    if (this.props.loading || SYNCING_STATUS.includes(this.props.status)) {
      return <Spinner tagName='span' size={13} />
    }

    return <StatusBadge intent={this.statusIntent} />
  }

  render (): ReactNode {
    return (
      <Button
        className={this.className}
        onClick={() => this.props.onClick()}
        minimal={true}
        small={true}
        rightIcon='cog'
        intent={this.buttonIntent}
      >
        {this.renderBadge()}
        {this.renderText()}
      </Button>
    )
  }
}

export default LNDStatus
