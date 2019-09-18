import * as lnd from '../domain/lnd'
import { delay } from '../../global-shared/util'

import React, { ReactNode } from 'react'
import { toaster, showSuccessToast, showErrorToast } from './AppToaster'
import {
  FormGroup,
  InputGroup,
  Classes,
  Button,
  Divider,
  Dialog
} from '@blueprintjs/core'
import './LNDConnect.css'
import {
  FilePathInput,
  FullScreenOverlay,
  InlineTooltip,
  ExternalLink
} from './components'
import LNDStatus from './LNDStatus'
import { Asset } from '../../global-shared/types'
import { getBalanceState } from '../domain/balance'
import LNDGraphic from './assets/sparkswap-lnd.svg'
import ZapLogo from './assets/zap.svg'
import LNAppLogo from './assets/lightning-app.svg'
import LPULogo from './assets/lightning-power.png'

interface LNDConnectState {
  isUnmounted: boolean,
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
  [lnd.Statuses.NO_CONFIG]: 'Sparkswap is not configured.',
  [lnd.Statuses.OLD_VERSION]: 'LND was found, but the version is too old.'
})

const POLL_INTERVAL = 1000

class LNDConnect extends React.Component<{}, LNDConnectState> {
  constructor (props: {}) {
    super(props)
    const {
      hostName,
      port,
      tlsCertPath,
      macaroonPath,
      configured
    } = lnd.getConnectionConfig()

    this.state = {
      isUnmounted: false,
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

    this.pollStatus()
  }

  componentDidMount (): void {
    if (this.state.configured) {
      this.afterConnectAttempt()
    }
  }

  componentWillUnmount (): void {
    this.setState({ isUnmounted: true })
  }

  isConnected (): boolean {
    const lndStatus = this.state.status
    return lndStatus === lnd.Statuses.VALIDATED ||
          lndStatus === lnd.Statuses.LOCKED ||
          lndStatus === lnd.Statuses.NEEDS_WALLET ||
          lndStatus === lnd.Statuses.UNLOCKED ||
          lndStatus === lnd.Statuses.NOT_SYNCED
  }

  isReady (): boolean {
    return this.state.status === lnd.Statuses.VALIDATED
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
      showErrorToast(`Error while loading config: ${e.message}`)
    }
  }

  async updateStatus (newStatus?: lnd.Statuses): Promise<void> {
    try {
      const oldStatus = this.state.status
      const status = newStatus || await lnd.getStatus()
      this.setState({ status })
      if (status === lnd.Statuses.VALIDATED && status !== oldStatus) {
        getBalanceState(Asset.BTC)
      }
    } catch (e) {
      this.setState({ status: lnd.Statuses.UNAVAILABLE })
    }
  }

  hasConfig (): boolean {
    const { hostName, port, tlsCertPath, macaroonPath } = this.state
    return Boolean(hostName && port && tlsCertPath && macaroonPath)
  }

  async pollStatus (): Promise<void> {
    while (!this.state.isUnmounted) {
      if (this.hasConfig()) {
        await this.updateStatus()
      }
      await delay(POLL_INTERVAL)
    }
  }

  handleOverlayOpen = (): void => {
    this.setState({ overlayIsOpen: true })
    this.loadConfig()
  }

  handleOverlayClose = (): void => {
    this.setState({
      overlayIsOpen: false
    })
  }

  handleHostNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      hostName: e.target.value.trim()
    })
  }

  handlePortChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      port: e.target.value.trim()
    })
  }

  handleTlsCertPathChange = (tlsCertPath: string): void => {
    this.setState({
      tlsCertPath
    })
  }

  handleMacaroonPathChange = (macaroonPath: string): void => {
    this.setState({
      macaroonPath
    })
  }

  showConnectSuccess (): void {
    showSuccessToast(TOAST_MESSAGES[this.state.status])
  }

  showConnectError (message: string): void {
    showErrorToast(message,
      (this.state.overlayIsOpen || this.isConnected()) ? undefined : {
        text: 'Configure Manually',
        onClick: () => this.setState({ forceManualConfig: true })
      })
  }

  handleScan = async (): Promise<void> => {
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
      this.updateStatus(status)

      switch (status) {
        case lnd.Statuses.VALIDATED:
          this.handleOverlayClose()
          this.showConnectSuccess()
          break
        case lnd.Statuses.LOCKED:
        case lnd.Statuses.NEEDS_WALLET:
        case lnd.Statuses.UNLOCKED:
        case lnd.Statuses.NOT_SYNCED:
        case lnd.Statuses.OLD_VERSION:
          showErrorToast(TOAST_MESSAGES[status])
          this.loadConfig()
          this.setState({
            forceManualConfig: true
          })
          break
        default:
          this.showConnectError('A local LND instance was not found.')
      }
    } catch (e) {
      return this.showConnectError(`Error while scanning: ${e.message}`)
    } finally {
      this.setState({
        scanning: false
      })
      toaster.dismiss(toastId)
    }
  }

  afterConnectAttempt = async (): Promise<void> => {
    this.setState({ loading: true })
    await this.updateStatus()
    this.setState({ loading: false })

    if (this.isConnected()) {
      this.handleOverlayClose()
    }

    if (this.isReady()) {
      this.showConnectSuccess()
    } else {
      this.showConnectError(TOAST_MESSAGES[this.state.status])
    }
  }

  handleConnect = async (): Promise<void> => {
    const {
      hostName,
      port,
      tlsCertPath,
      macaroonPath
    } = this.state

    if (!hostName || !port || !tlsCertPath || !macaroonPath) {
      showErrorToast('All fields are required')
      return
    }

    if (hostName.includes('/') || hostName.includes(':')) {
      showErrorToast('Host is invalid; should not contain "/" or ":"')
      return
    }

    this.setState({ loading: true })

    try {
      await lnd.connect({ hostName, port: parseInt(port, 10), tlsCertPath, macaroonPath })
    } catch (e) {
      this.showConnectError(`Error while connecting: ${e.message}`)
    } finally {
      this.setState({ loading: false })
    }

    await this.afterConnectAttempt()
  }

  renderConfigButtons (): ReactNode {
    const { scanning } = this.state

    return (
      <React.Fragment>
        <div className={`${Classes.DIALOG_FOOTER_ACTIONS} AutoConnectButtons`}>
          <Button
            large={true}
            onClick={() => this.setState({ isDownloadDialogOpen: true })}
          >Download LND</Button>
          <Divider />
          <Button large={true} className='scan-button' loading={scanning} onClick={this.handleScan}>Scan for LND</Button>
        </div>
        <Button icon="cog" minimal={true} onClick={() => this.setState({ forceManualConfig: true })}>Configure manually</Button>
      </React.Fragment>
    )
  }

  renderAutoConfig (): ReactNode {
    return (
      <React.Fragment>
        <div className="AutoConnect">
          <img src={LNDGraphic} className="ConnectGraphic" alt="Sparkswap + LND" />
          <p>To buy Bitcoin instantly over the Lightning Network, first establish a connection to your LND node.</p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          {this.renderConfigButtons()}
        </div>
      </React.Fragment>
    )
  }

  renderManualConfigButtons (): ReactNode {
    const {
      configured,
      scanning
    } = this.state

    if (configured) {
      return (
        <Button
          minimal={true}
          loading={scanning}
          onClick={this.handleScan}
        >Scan for LND</Button>
      )
    }

    return (
      <React.Fragment>
        <Button
          minimal={true}
          onClick={() => this.setState({ forceManualConfig: false })}
        >Go back</Button>
        <Button
          minimal={true}
          onClick={() => this.setState({ overlayIsOpen: false, isDownloadDialogOpen: false }) }
        >Skip Configuration</Button>
      </React.Fragment>
    )
  }

  renderManualConfig (): ReactNode {
    const {
      hostName,
      port,
      tlsCertPath,
      macaroonPath,
      loading
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
          {this.renderManualConfigButtons()}
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
        <FullScreenOverlay isOpen={overlayIsOpen} onClose={this.handleOverlayClose} showHomeButton={configured} title="Connect to LND">
          {configured || forceManualConfig ? this.renderManualConfig() : this.renderAutoConfig()}
        </FullScreenOverlay>
        <Dialog
          title="Download LND"
          className="download-lnd"
          isOpen={this.state.isDownloadDialogOpen}
          onClose={() => this.setState({ isDownloadDialogOpen: false })}
        >
          <div className={Classes.DIALOG_BODY}>
            <p>
              Don&apos;t have LND yet? Download one of the apps below to install a Lightning node on your machine:
              <ul className="bp3-list-unstyled">
                <li>
                  <ExternalLink href="https://zap.jackmallers.com">
                    <img src={ZapLogo} alt="Zap Desktop" />
                    Zap
                  </ExternalLink>
                </li>
                <li><Divider /></li>
                <li>
                  <ExternalLink href="https://github.com/lightninglabs/lightning-app/releases">
                    <img src={LNAppLogo} alt="Lightning App" />
                    Lightning App
                  </ExternalLink>
                </li>
                <li><Divider /></li>
                <li>
                  <ExternalLink href="https://github.com/lightning-power-users/node-launcher">
                    <img src={LPULogo} alt="Node Launcher" />
                    Node Launcher
                  </ExternalLink>
                </li>
              </ul>
            </p>

          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button fill={true} onClick={() => this.setState({ isDownloadDialogOpen: false })}>Cancel</Button>
            </div>
          </div>
        </Dialog>
      </div>
    )
  }
}

export default LNDConnect
