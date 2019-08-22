import React, { ReactNode, RefObject } from 'react'
import { ExternalButton, ExternalLink } from './components'
import { Classes, Button, Dialog, H5, Spinner } from '@blueprintjs/core'
import { showErrorToast } from './AppToaster'
import './Onboarding.css'
import { getAuth } from '../domain/main-request'
import { ANCHOR_PARTITION } from '../../common/constants'
import { delay } from '../../global-shared/util'
import { WebviewTag } from 'electron'
import WebviewCSSPath from './OnboardingWebview.css.txt'

// We assume development will always refer to `register-sandbox`
const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'https://sparkswap.com/register-sandbox/'
  : 'https://sparkswap.com/register/'

export enum OnboardingStage {
  NONE,
  REGISTER,
  DEPOSIT
}

interface RegisterDialogState {
  hasClickedRegister: boolean,
  loading: boolean,
  uuid?: string
}

interface RegisterDialogProps {
  onProceed: Function,
  isOpen: boolean,
  onClose: Function
}

export class RegisterDialog extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = {
      hasClickedRegister: false,
      loading: true
    }
  }

  componentDidMount (): void {
    this.updateUUID()
  }

  async updateUUID (): Promise<void> {
    const { uuid } = await getAuth()
    this.setState({
      loading: false,
      uuid: uuid
    })
  }

  get registrationUrl (): string {
    return `${BASE_URL}${this.state.uuid}`
  }

  get registerText (): ReactNode {
    const textBeforeClickingRegister = (
      <React.Fragment>
        <p>In order to use Sparkswap, you must first verify your identity.</p>
        <p>Upon clicking Verify ID, you will be prompted to a registration page to confirm your identity.</p>
      </React.Fragment>
    )

    const textAfterClickingRegister = (
      <React.Fragment>
        <p>If you have completed the initial verification process, click the button below to proceed to <b>Step 2</b> and deposit USD into Sparkswap.</p>
        <p>Click <ExternalLink href={this.registrationUrl}>here</ExternalLink> if you still need to verify your identity.</p>
      </React.Fragment>
    )

    return this.state.hasClickedRegister
      ? textAfterClickingRegister
      : textBeforeClickingRegister
  }

  handleRegister = () => {
    this.setState({ hasClickedRegister: true })
  }

  handleDone = async () => {
    this.setState({ loading: true })
    await this.props.onProceed()
    this.setState({ loading: false })
  }

  renderButton (): ReactNode {
    if (this.state.hasClickedRegister) {
      return (
        <Button
          text="Next Step"
          rightIcon='double-chevron-right'
          onClick={this.handleDone}
          className='RegisterButton'
          fill={true}
          loading={this.state.loading}
        />
      )
    }

    return (
      <ExternalButton
        href={this.registrationUrl}
        onClick={this.handleRegister}
        rightIcon='share'
        text='Verify ID'
        className='RegisterButton'
        fill={true}
        loading={this.state.loading}
      />
    )
  }

  render (): ReactNode {
    return (
      <Dialog
        title="Deposit USD"
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
      >
        <div className={Classes.DIALOG_BODY}>
          <H5>
            Step 1 of 2
            <span className='subtitle'>Verify Your Identity</span>
          </H5>
          {this.registerText}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button
            minimal={true}
            text="Return to app"
            onClick={() => this.props.onClose()}
          />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            {this.renderButton()}
          </div>
        </div>
      </Dialog>
    )
  }
}

interface DepositDialogProps {
  depositUrl: string,
  onClose: Function,
  isOpen: boolean
}

interface DepositDialogState {
  webviewIsLoading: boolean
}

enum AnchorStatus {
  SUCCESS = 'success',
  PENDING = 'pending',
  DENIED = 'denied'
}

// TODO: this may change once Anchor sends postMessage events
interface AnchorPostMessageEvent extends MessageEvent {
  data: {
    status: AnchorStatus
  }
}

export class DepositDialog extends React.Component<DepositDialogProps, DepositDialogState> {
  private webviewRef: RefObject<WebviewTag>
  private webviewCSS?: string

  constructor (props: DepositDialogProps) {
    super(props)
    this.webviewRef = React.createRef()
    this.state = {
      webviewIsLoading: true
    }

    this.loadCSS()
  }

  async loadCSS (): Promise<string | undefined> {
    if (this.webviewCSS) {
      return this.webviewCSS
    }
    try {
      this.webviewCSS = await (await fetch(WebviewCSSPath)).text()
      return this.webviewCSS
    } catch (e) {
      console.error(`Error while loading css for injection: ${e.message}`)
    }
  }

  handleAnchorStatus (status: AnchorStatus): void {
    throw new Error(`NOT IMPLEMENTED: ${status}`)
  }

  handleMessage (e: AnchorPostMessageEvent): void {
    const { status } = e.data
    this.handleAnchorStatus(status)
  }

  handleWebviewReady = async (): Promise<void> => {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) return

    const webviewCSS = await this.loadCSS()

    if (!webviewCSS) {
      showErrorToast('Error loading deposit workflow. Please try again.')
      this.props.onClose()
      return
    }

    webviewNode.insertCSS(webviewCSS)
    await delay(100)
    this.setState({ webviewIsLoading: false })
  }

  handleWebview = (): void => {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) return

    webviewNode.addEventListener('dom-ready', this.handleWebviewReady)
    webviewNode.addEventListener('message', this.handleMessage as EventListener)
  }

  handleCloseWebview = (): void => {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) return

    this.setState({ webviewIsLoading: true })
    webviewNode.removeEventListener('dom-ready', this.handleWebviewReady)
    webviewNode.removeEventListener('message', this.handleMessage as EventListener)
  }

  componentWillUnmount (): void {
    this.handleCloseWebview()
  }

  get className (): string {
    return [
      'DepositDialog',
      this.state.webviewIsLoading ? 'webview-loading' : ''
    ].filter(Boolean).join(' ')
  }

  renderNonWebviewContent (): ReactNode {
    if (this.state.webviewIsLoading) {
      return <Spinner size={Spinner.SIZE_LARGE} className='AnchorSpinner' />
    }

    return <p>In order to deposit USD and purchase BTC within you must first link to your bank. Once linked you will be able to deposit USD into Sparkswap.</p>
  }

  render (): ReactNode {
    const urlWithPostMessage = `${this.props.depositUrl}&callback=postMessage`

    return (
      <Dialog
        className={this.className}
        title="Deposit USD"
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
        onOpened={this.handleWebview}
        onClosed={this.handleCloseWebview}
      >
        <div className={Classes.DIALOG_BODY}>
          <H5>
            Step 2 of 2
            <span className='subtitle'>Link to Bank</span>
          </H5>
          {this.renderNonWebviewContent()}
          <webview
            id="AnchorDepositIFrame"
            ref={this.webviewRef}
            partition={ANCHOR_PARTITION}
            src={urlWithPostMessage}
          />
        </div>
      </Dialog>
    )
  }
}
