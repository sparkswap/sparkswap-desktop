import React, { ReactNode, RefObject } from 'react'
import { ExternalButton, ExternalLink, SpinnerMessage } from './components'
import { Classes, Button, Dialog, H5, Spinner, IActionProps } from '@blueprintjs/core'
import './Onboarding.css'
import { getWebviewPreloadPath, openLinkInBrowser } from '../domain/main-request'
import { isPlaidMessage, PlaidMessage, PlaidEvent } from '../domain/plaid'
import { ANCHOR_PARTITION } from '../../common/constants'
import { delay } from '../../global-shared/util'
import {
  isAnchorMessage,
  AnchorMessage,
  AnchorStatus,
  ANCHOR_DEPOSIT_PATH,
  ANCHOR_DASHBOARD_PATH,
  ANCHOR_PHOTO_ID_PATH
} from '../../global-shared/anchor-engine/api'
import { WebviewTag, IpcMessageEvent } from 'electron'
import WebviewCSSPath from './OnboardingWebview.css.txt'
import { IS_PRODUCTION } from '../../common/config'

const WEBVIEW_PRELOAD_PATH = getWebviewPreloadPath()

// We assume development will always refer to `register-sandbox`
const BASE_URL = IS_PRODUCTION
  ? 'https://sparkswap.com/register/'
  : 'https://sparkswap.com/register-sandbox/'

export enum OnboardingStage {
  NONE,
  REGISTER,
  DEPOSIT
}

interface RegisterDialogState {
  hasClickedRegister: boolean,
  loading: boolean
}

interface RegisterDialogProps {
  onProceed: Function,
  isOpen: boolean,
  onClose: Function,
  uuid?: string
}

export function getRegistrationURL (uuid: string): string {
  return `${BASE_URL}${uuid}`
}

export class RegisterDialog extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = {
      hasClickedRegister: false,
      loading: false
    }
  }

  get registrationUrl (): string {
    return getRegistrationURL(this.props.uuid || '')
  }

  get registerText (): ReactNode {
    const textBeforeClickingRegister = (
      <React.Fragment>
        <p>In order to trade on Sparkswap, you need to complete the identity verification process through our partner Abacus.</p>
        <p>If you have any questions or concerns about this process, please visit <ExternalLink href="https://support.sparkswap.com/identity-verification">support.sparkswap.com/identity-verification</ExternalLink>.</p>
        <p>Upon clicking <ExternalLink href={this.registrationUrl}>Verify ID</ExternalLink>, you will be taken to a webpage to submit your identity information.</p>
      </React.Fragment>
    )

    const textAfterClickingRegister = (
      <React.Fragment>
        <p>If you have submitted your information, click the button below to proceed to <b>Step 2</b> and deposit USD into Sparkswap.</p>
        <p>Click <ExternalLink href={this.registrationUrl}>here</ExternalLink> if you still need to verify your identity with Abacus.</p>
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
        text='Verify ID with Abacus'
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

enum DEPOSIT_ERROR_MESSAGE {
  ERROR = 'Error in deposit workflow. Please try again.',
  PENDING_REVIEW = 'Deposit is pending review. AnchorUSD will notify you via email with further instructions.',
  ADDITIONAL_INFO_NEEDED = 'Additional info is needed to verify your identity.'
}

interface DepositDialogProps {
  showSteps: boolean,
  depositUrl: string,
  onClose: Function,
  isOpen: boolean,
  onDepositDone: (amount: number) => void,
  onDepositError: (message: string, action?: IActionProps) => void
}

interface DepositDialogState {
  webviewIsLoading: boolean,
  isPlaidOpen: boolean,
  loadingMessage?: string
}

async function sendToWebview (wv: WebviewTag, channel: string): Promise<unknown> {
  return new Promise((resolve) => {
    const listener = (event: IpcMessageEvent): void => {
      if (event.channel !== channel) return
      wv.removeEventListener('ipc-message', listener)
      resolve(event.args[0])
    }
    wv.addEventListener('ipc-message', listener)
    wv.send(channel)
  })
}

async function waitForWebviewPath (wv: WebviewTag, path: string, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (new URL(wv.getURL()).pathname === path) {
      resolve()
      return
    }
    setTimeout(() => reject(new Error(`Timeout while waiting for webview path: ${path}`)), timeout)

    const listener = (): void => {
      wv.removeEventListener('dom-ready', listener)
      waitForWebviewPath(wv, path).then(resolve).catch(reject)
    }
    wv.addEventListener('dom-ready', listener)
  })
}

const INSERT_CSS_DELAY = 500
const PLAID_TRANSITION_DELAY = 500
const CHECK_DOM_DELAY = 100
const CHECK_DOM_TIMEOUT = 10000

const DepositDialogInitialState: DepositDialogState = {
  webviewIsLoading: true,
  isPlaidOpen: false,
  loadingMessage: undefined
}

export class DepositDialog extends React.Component<DepositDialogProps, DepositDialogState> {
  private webviewRef: RefObject<WebviewTag>
  private webviewCSS?: string

  constructor (props: DepositDialogProps) {
    super(props)
    this.webviewRef = React.createRef()
    this.state = DepositDialogInitialState

    // eagerly load since this requires network requests
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
      console.error(`Error while loading CSS for injection: ${e.message}`)
    }
  }

  depositError (message: string = DEPOSIT_ERROR_MESSAGE.ERROR, action?: IActionProps): void {
    this.props.onDepositError(message, action)
  }

  handleMessage = (evt: IpcMessageEvent): void => {
    if (evt.channel !== 'message') {
      return
    }

    const data = evt.args[0]

    try {
      const message = JSON.parse(data as string)

      if (isPlaidMessage(message)) {
        this.handlePlaidMessage(message)
      } else if (isAnchorMessage(message)) {
        this.handleAnchorMessage(message)
      } else {
        console.debug(`unknown message: ${data}`)
      }
    } catch (e) {
      console.debug(`Bad format on ipc message: ${data}`)
    }
  }

  async waitForAnchorLoad (): Promise<void> {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) {
      throw new Error('Webview does not exist')
    }

    for (let i = 0; i < CHECK_DOM_TIMEOUT / CHECK_DOM_DELAY; i++) {
      if (!this.props.isOpen) return
      const isLoading = await sendToWebview(webviewNode, 'js:isPaymentMethodLoading')
      if (!isLoading) return
      await delay(CHECK_DOM_DELAY)
    }

    throw new Error('Timeout while waiting for anchor to load')
  }

  async handlePlaidMessage (message: PlaidMessage): Promise<void> {
    switch (message.eventName) {
      case PlaidEvent.OPEN:
        this.hideAnchorAmount()
        this.setState({ isPlaidOpen: true })
        break
      case PlaidEvent.HANDOFF:
        // Anchor's UI goes into a weird state while transitioning,
        // so we go into a loading state until it's ready
        this.setState({
          isPlaidOpen: false,
          webviewIsLoading: true,
          loadingMessage: 'Loading Bank Data'
        })
        this.showAnchorAmount()

        try {
          await this.waitForAnchorLoad()
        } catch (e) {
          console.debug(`Error while waiting for anchor to load: ${e.message}`)
          return this.depositError()
        }

        if (this.props.isOpen) {
          this.setState({ webviewIsLoading: false })
        }
        break
      case PlaidEvent.EXIT:
        this.setState({
          isPlaidOpen: false,
          webviewIsLoading: true
        })
        this.showAnchorAmount()
        await delay(PLAID_TRANSITION_DELAY)
        if (this.props.isOpen) {
          this.setState({ webviewIsLoading: false })
        }
    }
  }

  async getDepositAmount (): Promise<number> {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) {
      throw new Error('Error while getting webview')
    }

    await waitForWebviewPath(webviewNode, ANCHOR_DASHBOARD_PATH)

    const successMessage = (await sendToWebview(webviewNode, 'js:getSuccessText')) as string
    const amountMatch = successMessage.match(/[\d.]+/g)
    if (!amountMatch) {
      throw new Error('Error while finding decimal match')
    }

    const amountDeposited = parseFloat(amountMatch[0])
    if (isNaN(amountDeposited)) {
      throw new Error('Error while parsing deposit amount')
    }

    return amountDeposited
  }

  async handleAnchorMessage (message: AnchorMessage): Promise<void> {
    // We shouldn't encounter this, but if we do our UI likely already handles
    if (message.status === AnchorStatus.PENDING) return

    // since our other operations here are async, we want to show the loading
    // indicator immediately to avoid flashing the anchor-styled screen to
    // user
    this.setState({
      webviewIsLoading: true,
      loadingMessage: 'Completing Deposit'
    })

    if (message.status === AnchorStatus.DENIED) {
      return this.depositError(DEPOSIT_ERROR_MESSAGE.PENDING_REVIEW)
    }

    try {
      const amountDeposited = await this.getDepositAmount()
      this.props.onDepositDone(amountDeposited)
    } catch (e) {
      console.debug(`Error while getting deposit amount: ${e.message}`)
      this.depositError()
    }
  }

  handleWebviewReady = async (): Promise<void> => {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) return

    const webviewUrl = new URL(webviewNode.getURL())
    if (webviewUrl.pathname === ANCHOR_PHOTO_ID_PATH) {
      return this.depositError(DEPOSIT_ERROR_MESSAGE.ADDITIONAL_INFO_NEEDED, {
        text: 'Contact support',
        onClick: () => openLinkInBrowser('https://support.sparkswap.com/additional-identity-verification')
      })
    }

    if (webviewUrl.pathname !== ANCHOR_DEPOSIT_PATH) {
      return
    }

    const webviewCSS = await this.loadCSS()

    if (!webviewCSS) {
      console.debug(`Error while loading CSS for webview`)
      return this.depositError()
    }

    webviewNode.insertCSS(webviewCSS)
    await delay(INSERT_CSS_DELAY)
    this.setState({ webviewIsLoading: false })
  }

  handleWebview = (): void => {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) return

    webviewNode.addEventListener('dom-ready', this.handleWebviewReady)
    webviewNode.addEventListener('ipc-message', this.handleMessage as EventListener)
  }

  handleCloseWebview = (): void => {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) return

    this.setState(DepositDialogInitialState)
    webviewNode.removeEventListener('dom-ready', this.handleWebviewReady)
    webviewNode.removeEventListener('ipc-message', this.handleMessage as EventListener)
  }

  hideAnchorAmount (): void {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) {
      console.debug(`Error: Webview does not exist`)
      return this.depositError()
    }
    webviewNode.send('js:hideAnchorAmount')
  }

  showAnchorAmount (): void {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) {
      console.debug(`Error: Webview does not exist`)
      return this.depositError()
    }
    webviewNode.send('js:showAnchorAmount')
  }

  componentWillUnmount (): void {
    this.handleCloseWebview()
  }

  get className (): string {
    return [
      'DepositDialog',
      this.state.webviewIsLoading ? 'webview-loading' : '',
      this.state.isPlaidOpen ? 'plaid' : ''
    ].filter(Boolean).join(' ')
  }

  get backdropClassName (): string {
    return this.state.isPlaidOpen ? 'plaid' : ''
  }

  renderNonWebviewContent (): ReactNode {
    if (this.state.webviewIsLoading) {
      return <SpinnerMessage size={Spinner.SIZE_LARGE} className='AnchorSpinner' message={this.state.loadingMessage} />
    }

    return (
      <React.Fragment>
        <p>In order to purchase BTC, you must transfer USD from your bank using our payment processing partner, <strong>AnchorUSD</strong>.</p>
        <p>Link your bank account and transfer your funds to AnchorUSD securely to continue.</p>
        <p>For more information on how USD is handled, please visit <ExternalLink href="https://support.sparkswap.com/usd-handling">support.sparkswap.com/usd-handling</ExternalLink>.</p>
      </React.Fragment>
    )
  }

  maybeRenderTitle (): ReactNode {
    if (this.props.showSteps) {
      return (
        <H5>
          Step 2 of 2
          <span className='subtitle'>Link to Bank</span>
        </H5>
      )
    }
  }

  render (): ReactNode {
    const urlWithPostMessage = `${this.props.depositUrl}&callback=postMessage`

    return (
      <Dialog
        className={this.className}
        backdropClassName={this.backdropClassName}
        title="Deposit USD"
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
        onOpened={this.handleWebview}
        onClosed={this.handleCloseWebview}
      >
        <div className={Classes.DIALOG_BODY}>
          {this.maybeRenderTitle()}
          {this.renderNonWebviewContent()}
          <webview
            id="AnchorDepositIFrame"
            ref={this.webviewRef}
            partition={ANCHOR_PARTITION}
            src={urlWithPostMessage}
            preload={`file://${WEBVIEW_PRELOAD_PATH}`}
          />
        </div>
      </Dialog>
    )
  }
}
