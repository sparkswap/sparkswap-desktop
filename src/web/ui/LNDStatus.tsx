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

class LNDStatus extends React.Component<LNDStatusProps, {}> {
  get buttonIntent (): Intent {
    if (this.props.status === lnd.Statuses.VALIDATED) {
      return Intent.NONE
    }

    return Intent.WARNING
  }

  get statusIntent (): Intent {
    if (this.props.status === lnd.Statuses.VALIDATED) {
      return Intent.SUCCESS
    }

    return Intent.WARNING
  }

  get text (): React.ReactNode {
    return STATUS_TEXT[this.props.status]
  }

  render (): ReactNode {
    const buttonProps = {
      onClick: () => this.props.onClick(),
      minimal: true,
      small: true
    }

    if (this.props.loading) {
      return (
        <Button
          {...buttonProps}
          rightIcon='cog'
          className='settings-button loading'
        >
          <Spinner tagName='span' size={13} />
          Connecting to LND
        </Button>
      )
    }

    return (
      <Button
        {...buttonProps}
        rightIcon='cog'
        className='settings-button'
        intent={this.buttonIntent}
      >
        <StatusBadge intent={this.statusIntent} pulse={this.statusIntent === Intent.WARNING} />
        {this.text}
      </Button>
    )
  }
}

export default LNDStatus
