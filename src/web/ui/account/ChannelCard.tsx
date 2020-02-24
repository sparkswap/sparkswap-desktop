import React, { ReactNode } from 'react'
import {
  Card,
  Intent,
  Icon,
  IconName,
  H5,
  H6
} from '@blueprintjs/core'
import logger from '../../../global-shared/logger'
import {
  Asset,
  Channel,
  ChannelStatus
} from '../../../global-shared/types'
import {
  delay,
  parseNetworkAddress
} from '../../../global-shared/util'
import { asAmount } from '../../../global-shared/currency-conversions'
import { formatAmount, sliceMiddle } from '../../../common/formatters'
import { getLNAlias, closeChannel } from '../../domain/main-request'
import { getGraphLink, getTxLink } from '../../domain/explorers'
import { ExternalLink } from '../components/ExternalSource'
import StatusBadge from '../components/StatusBadge'
import AlertButton from '../components/AlertButton'
import { showLoadingToast, showErrorToast, showSuccessToast } from '../AppToaster'
import './ChannelCard.css'

const MAX_ALIAS_ATTEMPTS = 5
const RETRY_ALIAS_DELAY_MS = 5000

function getAlias (pubKey: string, alias?: string): string {
  if (alias) {
    if (alias.length <= 9) {
      return alias
    }
    return `${alias.slice(0, 8)}...`
  }
  return sliceMiddle(pubKey, 10)
}

function getTxHash (id: string): string {
  const [txHash] = id.split(':')
  return txHash
}

function getTxOutput (id: string): string {
  const [, txOutput] = id.split(':')
  return txOutput
}

// convert the tx into something we can represent as a short number (six digits)
function getNumericChanId (id: string): string {
  const firstHashBytes = parseInt(getTxHash(id).slice(0, 4), 16)
  const output = parseInt(getTxOutput(id), 10)

  return firstHashBytes.toString().slice(0, 5) + output.toString()
}

interface StatusProps {
  text: string,
  intent: Intent
}

const STATUS_UI: Record<ChannelStatus, StatusProps> = Object.freeze({
  [ChannelStatus.PENDING_OPEN]: {
    text: 'opening',
    intent: Intent.WARNING
  },
  [ChannelStatus.ACTIVE]: {
    text: 'online',
    intent: Intent.SUCCESS
  },
  [ChannelStatus.INACTIVE]: {
    text: 'offline',
    intent: Intent.DANGER
  },
  [ChannelStatus.WAITING_CLOSE]: {
    text: 'broadcasting',
    intent: Intent.DANGER
  },
  [ChannelStatus.PENDING_COOP_CLOSE]: {
    text: 'closing',
    intent: Intent.DANGER
  },
  [ChannelStatus.PENDING_FORCE_CLOSE]: {
    text: 'closing',
    intent: Intent.DANGER
  },
  [ChannelStatus.CLOSED]: {
    text: 'closed',
    intent: Intent.DANGER
  }
})

interface ChannelCardProps {
  channel: Channel,
  forceUpdate: Function
}

interface ChannelCardState {
  isOpen: boolean,
  alias?: string
}

const SECONDS_PER_HOUR = 60 * 60
const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24

function getDelayText (forceCloseDelay?: number): string {
  if (!forceCloseDelay) {
    return 'a few days'
  }

  if (forceCloseDelay <= SECONDS_PER_DAY) {
    return `${Math.ceil(forceCloseDelay / SECONDS_PER_HOUR)} ` +
           `hour${forceCloseDelay <= SECONDS_PER_HOUR ? '' : 's'}`
  }

  return `${Math.ceil(forceCloseDelay / SECONDS_PER_DAY)} ` +
         `days`
}

class ChannelCard extends React.Component<ChannelCardProps, ChannelCardState> {
  constructor (props: ChannelCardProps) {
    super(props)
    this.state = {
      isOpen: false
    }
  }

  get remotePubKey (): string {
    const { remoteAddress } = this.props.channel
    const { id: remotePubKey } = parseNetworkAddress(remoteAddress)

    return remotePubKey
  }

  async updateAlias (): Promise<void> {
    let err: Error | undefined
    let attempts = 0

    do {
      try {
        const alias = await getLNAlias(this.remotePubKey)
        if (!alias) {
          throw new Error('Empty alias')
        }
        this.setState({ alias })
        err = undefined
      } catch (e) {
        err = e
        logger.debug(`Error while retrieving node alias for ${this.remotePubKey}: ${e.message}. ` +
          `Retrying in ${RETRY_ALIAS_DELAY_MS}ms`)
      }
    } while (err != null && attempts++ < MAX_ALIAS_ATTEMPTS && await delay(RETRY_ALIAS_DELAY_MS))

    if (err != null) {
      logger.debug(`Unable to retrieve node alias for ${this.remotePubKey}: ${err.message}. ` +
        `Stopping after ${attempts} attempts.`)
    }
  }

  componentDidMount (): void {
    this.updateAlias()
  }

  componentDidUpdate (prevProps: ChannelCardProps): void {
    const oldChannel = prevProps.channel
    const { channel } = this.props
    if (oldChannel.remoteAddress !== channel.remoteAddress) {
      this.updateAlias()
    }
  }

  handleChannelClose = async (forceClose: boolean): Promise<void> => {
    const loadingMessage = forceClose ? 'Force closing channel' : 'Closing channel'
    const stopLoading = showLoadingToast(loadingMessage)
    try {
      await closeChannel(this.props.channel.id, forceClose)
    } catch (e) {
      showErrorToast(`Error while closing channel: ${e.message}`)
      return
    } finally {
      stopLoading()
    }
    showSuccessToast('Channel close in progress')
    await this.props.forceUpdate()
  }

  renderActions (): ReactNode {
    const { channel } = this.props
    const { status } = channel

    switch (status) {
      case ChannelStatus.ACTIVE:
        return (
          <AlertButton
            buttonText='Close'
            buttonProps={{
              className: 'details channel-close',
              intent: Intent.WARNING,
              icon: 'cross'
            }}
            intent={Intent.WARNING}
            confirmButtonText='Close channel'
            onConfirm={() => this.handleChannelClose(false)}
            cancelButtonText='Cancel'
            icon='warning-sign'
            canOutsideClickCancel
            canEscapeKeyCancel
          >
            <p>
              You will no longer be able to use this channel on the Lightning Network
              if you close it. Are you sure?
            </p>
          </AlertButton>
        )
      case ChannelStatus.PENDING_OPEN:
      case ChannelStatus.INACTIVE:
        return (
          <AlertButton
            buttonText='Force Close'
            buttonProps={{
              className: 'details channel-close',
              intent: Intent.DANGER,
              icon: 'cross'
            }}
            intent={Intent.DANGER}
            confirmButtonText='Force Close Channel'
            onConfirm={() => this.handleChannelClose(true)}
            cancelButtonText='Cancel'
            icon='warning-sign'
            canOutsideClickCancel
            canEscapeKeyCancel
          >
            <p>
              You will incur transaction fees and your funds will be locked for&nbsp;
              {getDelayText(channel.forceCloseDelay)} if you force close this channel.
              Are you sure?
            </p>
          </AlertButton>
        )
      case ChannelStatus.PENDING_COOP_CLOSE:
        return (
          <span className='details subtitle channel-close'>
            Cooperative Close
          </span>
        )
      case ChannelStatus.PENDING_FORCE_CLOSE:
        return (
          <span className='details subtitle channel-close'>
            Force Close
          </span>
        )
      case ChannelStatus.WAITING_CLOSE:
        return null
      case ChannelStatus.CLOSED:
        return (
          <span className='details subtitle channel-close'>
            Closed
          </span>
        )
    }
  }

  render (): ReactNode {
    const { channel } = this.props
    const { status } = channel
    const { isOpen } = this.state
    const icon: IconName = isOpen ? 'chevron-down' : 'chevron-right'

    return (
      <Card
        className={`Channel ${isOpen ? 'expanded' : 'collapsed'}`}
        interactive
        onClick={() => this.setState({ isOpen: !isOpen })}
      >
        <H5 className='channel-peer'>
          {getAlias(this.remotePubKey, this.state.alias)}
          <span className='subtitle channel-id'>#{getNumericChanId(channel.id)}</span>
          <span className='pubkey subtitle details'>
            Remote Public Key
            <br />
            <ExternalLink href={getGraphLink(this.remotePubKey)}>
              {sliceMiddle(this.remotePubKey, 17)}
              <Icon icon='share' iconSize={14} />
            </ExternalLink>
          </span>
          <span className='channel-tx subtitle details'>
            Funding Transaction
            <br />
            <ExternalLink href={getTxLink(getTxHash(channel.id), getTxOutput(channel.id))}>
              {sliceMiddle(channel.id, 17)}
              <Icon icon='share' iconSize={14} />
            </ExternalLink>
          </span>
        </H5>
        <H6 className='channel-balance'>
          <div className='balance-component'>
            <span className='subtitle'>Balance</span>
            {formatAmount(asAmount(Asset.BTC, channel.localBalance))}
          </div>
          <div className='balance-component details'>
            <span className='subtitle'>Send</span>
            {formatAmount(asAmount(Asset.BTC, channel.localBalance - channel.localReserve))}
          </div>
          <div className='balance-component details'>
            <span className='subtitle'>Receive</span>
            {formatAmount(asAmount(Asset.BTC, channel.remoteBalance - channel.remoteReserve))}
          </div>
        </H6>
        <div className='channel-actions'>
          <H6 className='channel-status text-muted'>
            {STATUS_UI[status].text}
            <StatusBadge
              usePulse={status !== ChannelStatus.INACTIVE}
              intent={STATUS_UI[status].intent}
            />
            <Icon
              icon={icon}
              iconSize={12}
            />
          </H6>
          {this.renderActions()}
        </div>
      </Card>
    )
  }
}

export default ChannelCard
