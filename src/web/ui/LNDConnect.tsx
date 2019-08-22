import * as lnd from '../domain/lnd'
import { delay } from '../../global-shared/util'

import React, { ReactNode } from 'react'
import { toaster } from './AppToaster'
import {
  FormGroup,
  InputGroup,
  Classes,
  Button,
  Dialog,
  ButtonGroup
} from '@blueprintjs/core'
import './LNDConnect.css'
import {
  FilePathInput,
  FullScreenOverlay,
  InlineTooltip,
  ExternalLink
} from './components'
import LNDStatus from './LNDStatus'

interface LNDConnectProps {
  onClose: () => void
}

interface LNDConnectState {
  overlayIsOpen: boolean,
  status: lnd.Statuses,
  hostName: string,
  port: string,
  tlsCertPath: string,
  macaroonPath: string,
  loading: boolean,
  scanning: boolean,
  configured: boolean,
  forceManualConfig: boolean,
  isDownloadDialogOpen: boolean
}

const TOAST_MESSAGES = Object.freeze({
  [lnd.Statuses.VALIDATED]: 'Successfully connected to LND.',
  [lnd.Statuses.LOCKED]: 'LND was found, but it is locked. Unlock it to continue.',
  [lnd.Statuses.NEEDS_WALLET]: 'LND was found, but it needs to be set up. Set it up to continue.',
  [lnd.Statuses.UNLOCKED]: 'LND was found, but it is not finished syncing. Wait until it is finished, and try again.',
  [lnd.Statuses.NOT_SYNCED]: 'LND was found, but it is not finished syncing. Wait until it is finished, and try again.',
  [lnd.Statuses.UNAVAILABLE]: 'LND is not reachable.',
  [lnd.Statuses.UNKNOWN]: 'LND is not reachable.',
  [lnd.Statuses.NO_CONFIG]: 'Sparkswap is not configured.'
})

const LOADING_TIMEOUT = 100

class LNDConnect extends React.Component<LNDConnectProps, LNDConnectState> {
  constructor (props: LNDConnectProps) {
    super(props)
    const {
      hostName,
      port,
      tlsCertPath,
      macaroonPath,
      configured
    } = lnd.getConnectionConfig()

    this.state = {
      loading: false,
      scanning: false,
      status: lnd.Statuses.UNKNOWN,
      forceManualConfig: false,
      overlayIsOpen: !configured,
      hostName,
      port: port ? port.toString() : '',
      tlsCertPath,
      macaroonPath,
      configured,
      isDownloadDialogOpen: false
    }
  }

  componentDidMount (): void {
    this.initialLoad()
  }

  async initialLoad (): Promise<void> {
    if (this.state.configured) {
      this.setState({
        loading: true
      })

      await this.updateStatus()

      this.setState({
        loading: false
      })

      if (this.state.status === lnd.Statuses.VALIDATED) {
        this.showConnectSuccess()
      }
    }
  }

  loadConfig (): void {
    try {
      const {
        hostName,
        port,
        tlsCertPath,
        macaroonPath,
        configured
      } = lnd.getConnectionConfig()

      this.setState({
        hostName,
        port: port ? port.toString() : '',
        tlsCertPath,
        macaroonPath,
        configured
      })
    } catch (e) {
      toaster.show({
        intent: 'danger',
        message: `Error while loading config: ${e.message}`
      })
    }
  }

  async updateStatus (): Promise<void> {
    try {
      const status = await lnd.getStatus()

      this.setState({
        status
      })
    } catch (e) {
      toaster.show({
        intent: 'danger',
        message: `Error while retrieving LND Status: ${e.message}`
      })
    }
  }

  handleOverlayOpen = () => {
    this.setState({ overlayIsOpen: true })
    this.loadConfig()
  }

  handleOverlayClose = () => {
    if (this.props.onClose) this.props.onClose()
    this.setState({
      overlayIsOpen: false
    })
  }

  handleHostNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      hostName: e.target.value
    })
  }

  handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      port: e.target.value
    })
  }

  handleTlsCertPathChange = (tlsCertPath: string) => {
    this.setState({
      tlsCertPath
    })
  }

  handleMacaroonPathChange = (macaroonPath: string) => {
    this.setState({
      macaroonPath
    })
  }

  showConnectSuccess (): void {
    toaster.show({
      intent: 'success',
      message: TOAST_MESSAGES[this.state.status]
    })
  }

  showAutoConnectErr (message: string): void {
    toaster.show({
      intent: 'danger',
      message,
      action: {
        text: 'Configure Manually',
        onClick: () => this.setState({ forceManualConfig: true })
      }
    })
    this.loadConfig()
  }

  handleScan = async () => {
    this.setState({
      scanning: true
    })

    const toastId = toaster.show({
      message: 'Scanning for LND',
      hideDismiss: true,
      timeout: 0,
      loading: true
    })

    try {
      const status = await lnd.scan()
      this.setState({
        status
      })

      switch (status) {
        case lnd.Statuses.VALIDATED:
          this.handleOverlayClose()
          this.showConnectSuccess()
          break
        case lnd.Statuses.LOCKED:
        case lnd.Statuses.NEEDS_WALLET:
        case lnd.Statuses.UNLOCKED:
        case lnd.Statuses.NOT_SYNCED:
          toaster.show({
            intent: 'danger',
            message: TOAST_MESSAGES[status]
          })
          this.loadConfig()
          this.setState({
            forceManualConfig: true
          })
          break
        default:
          this.showAutoConnectErr('A local LND instance was not found.')
      }
    } catch (e) {
      return this.showAutoConnectErr(`Error while scanning: ${e.message}`)
    } finally {
      this.setState({
        scanning: false
      })
      toaster.dismiss(toastId)
    }
  }

  handleConnect = async () => {
    const {
      hostName,
      port,
      tlsCertPath,
      macaroonPath
    } = this.state

    this.setState({
      loading: true
    })

    try {
      await lnd.connect({ hostName, port: parseInt(port, 10), tlsCertPath, macaroonPath })
      // delay to give time to update status
      await delay(LOADING_TIMEOUT)
      await this.updateStatus()
      if (this.state.status === lnd.Statuses.VALIDATED) {
        this.handleOverlayClose()
        toaster.show({
          intent: 'success',
          message: TOAST_MESSAGES[this.state.status]
        })
      } else {
        toaster.show({
          intent: 'danger',
          message: TOAST_MESSAGES[this.state.status]
        })
      }
    } catch (e) {
      toaster.show({
        intent: 'danger',
        message: `Error while connecting: ${e.message}`
      })
    } finally {
      this.setState({
        loading: false
      })
    }
  }

  renderConfigButtons (): ReactNode {
    const { scanning } = this.state

    return (
      <React.Fragment>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <ButtonGroup className="ConnectButtons" vertical={true}>
            <Button icon="offline" className='scan-button' large={true} loading={scanning} onClick={this.handleScan}>Scan for LND</Button>
            <Button icon="cog" large={true} onClick={() => this.setState({ forceManualConfig: true })}>Configure manually</Button>
            <Button
              minimal={true}
              onClick={() => this.setState({ isDownloadDialogOpen: true })}
            >I dont have LND yet</Button>
          </ButtonGroup>
        </div>
      </React.Fragment>
    )
  }

  renderAutoConfig (): ReactNode {
    return (
      <React.Fragment>
        <div>
          <p>Sparkswap needs to connect to your instance of LND to enable trading.</p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          {this.renderConfigButtons()}
        </div>
      </React.Fragment>
    )
  }

  renderManualConfig (): ReactNode {
    const {
      hostName,
      port,
      tlsCertPath,
      macaroonPath,
      loading,
      configured
    } = this.state

    return (
      <React.Fragment>
        <div>
          <FormGroup
            labelFor="lnd-hostname"
            label={
              <InlineTooltip
                content='The locally available URL or domain name where LND can be reached'
              >
                Host
              </InlineTooltip>
            }
          >
            <InputGroup
              id="lnd-hostname"
              placeholder="localhost"
              value={hostName}
              onChange={this.handleHostNameChange}
            />
          </FormGroup>
          <FormGroup
            labelFor="lnd-port"
            label={
              <InlineTooltip
                content="The port on which LND's RPC is available"
              >
                Port
              </InlineTooltip>
            }
          >
            <InputGroup
              id="lnd-port"
              placeholder="11009"
              value={port}
              onChange={this.handlePortChange}
            />
          </FormGroup>

          <FormGroup
            labelFor="lnd-tls-cert-path"
            label={
              <InlineTooltip
                content="The certificate for accessing LND's RPC. Typically located in LND's Home directory as 'tls.cert'"
              >
                TLS Certificate
              </InlineTooltip>
            }
          >
            <FilePathInput
              id="lnd-tls-cert-path"
              placeholder="/path/to/tls.cert"
              value={tlsCertPath}
              onChange={this.handleTlsCertPathChange}
            />
          </FormGroup>

          <FormGroup
            labelFor="lnd-macaroon-path"
            label={
              <InlineTooltip
                content="The macaroon for accessing actions on LND's RPC. Typically located in LND's data directory as 'admin.macaroon'"
              >
                Admin Macaroon
              </InlineTooltip>
            }
          >
            <FilePathInput
              id="lnd-macaroon-path"
              placeholder="/path/to/admin.macaroon"
              value={macaroonPath}
              onChange={this.handleMacaroonPathChange}
            />
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button large={true} onClick={this.handleConnect} loading={loading}>Connect to LND</Button>
          </div>
          {!configured
            ? <Button minimal={true} onClick={() => this.setState({ forceManualConfig: false })}>Go back</Button>
            : ''
          }
        </div>
      </React.Fragment>
    )
  }

  maybeRenderStatus (): ReactNode {
    const {
      overlayIsOpen,
      status,
      loading
    } = this.state

    if (overlayIsOpen) return

    return <LNDStatus status={status} loading={loading} onClick={this.handleOverlayOpen} />
  }

  render (): ReactNode {
    const {
      overlayIsOpen,
      configured,
      forceManualConfig
    } = this.state

    return (
      <div className="LNDConnect">
        {this.maybeRenderStatus()}
        <FullScreenOverlay isOpen={overlayIsOpen} onClose={this.handleOverlayClose} showHomeButton={configured} title="Connect LND">
          {configured || forceManualConfig ? this.renderManualConfig() : this.renderAutoConfig()}
        </FullScreenOverlay>
        <Dialog title="Download LND" icon="download" isOpen={this.state.isDownloadDialogOpen}>
          <div className={Classes.DIALOG_BODY}>
            <p>
              Don&apos;t have LND? Try one of these:
              <ul>
                <li><ExternalLink href="https://zap.jackmallers.com">Zap</ExternalLink></li>
                <li><ExternalLink href="https://github.com/lightninglabs/lightning-app/releases">Lightning App</ExternalLink></li>
                <li><ExternalLink href="https://github.com/lightning-power-users/node-launcher">Node Launcher</ExternalLink></li>
              </ul>
            </p>

          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={() => this.setState({
                overlayIsOpen: false, isDownloadDialogOpen: false })}>
                Skip configuration
              </Button>
              <Button
                intent="primary"
                onClick={() => this.setState({ isDownloadDialogOpen: false })}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    )
  }
}

export default LNDConnect
