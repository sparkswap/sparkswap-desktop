import React, { ReactNode, RefObject } from 'react'
import { Button, Classes, Dialog, H5, Spinner, IActionProps } from '@blueprintjs/core'
import { WebviewTag, IpcMessageEvent, FoundInPageEvent } from 'electron'
import WebviewCSSPath from './deposit-dialog-webview.css.txt'
import { SpinnerMessage, SpinnerSuccess } from '../components'
import logger from '../../../global-shared/logger'
import { getWebviewPreloadPath } from '../../domain/main-request'
import { balances, getBalanceState, BalanceState } from '../../domain/balance'
import { isPlaidMessage, PlaidMessage, PlaidEvent } from '../../domain/plaid'
import { ANCHOR_PARTITION, centsPerUSD } from '../../../common/constants'
import { delay } from '../../../global-shared/util'
import {
  isAnchorMessage,
  AnchorMessage,
  AnchorStatus,
  ANCHOR_DEPOSIT_PATH,
  ANCHOR_DASHBOARD_PATH,
  ANCHOR_PHOTO_ID_PATH
} from '../../../global-shared/anchor-engine/api'
import { formatDollarValue } from '.././formatters'
import { Asset } from '../../../global-shared/types'
import { openBeacon } from '../beacon'

const WEBVIEW_PRELOAD_PATH = getWebviewPreloadPath()

export enum OnboardingStage {
  NONE,
  REGISTER,
  DEPOSIT
}

enum DEPOSIT_ERROR_MESSAGE {
  ERROR = 'Error in deposit workflow. Please try again.',
  PENDING_REVIEW = 'Deposit is pending review. AnchorUSD will notify you via email with further instructions.',
  ADDITIONAL_INFO_NEEDED = 'Additional info is needed to verify your identity.',
  MANUAL_REVIEW = 'Your application is pending review. You will be notified via email with further instructions.'
}

const ANCHOR_MANUAL_REVIEW_TEXT = 'Your account is being reviewed'

interface DepositDialogProps {
  showSteps: boolean,
  depositUrl: string,
  onClose: Function,
  isOpen: boolean,
  onDepositDone: () => void,
  onDepositError: (message: string, action?: IActionProps) => void
}

interface DepositDialogState {
  webviewIsLoading: boolean,
  isPlaidOpen: boolean,
  loadingMessage?: string,
  isDone: boolean,
  amountDeposited?: number,
  instant?: boolean,
  previousBalance?: BalanceState
}

async function sendToWebview (webview: WebviewTag, channel: string): Promise<unknown> {
  return new Promise((resolve) => {
    const listener = (event: IpcMessageEvent): void => {
      if (event.channel !== channel) return
      webview.removeEventListener('ipc-message', listener)
      resolve(event.args[0])
    }
    webview.addEventListener('ipc-message', listener)
    webview.send(channel)
  })
}

async function waitForWebviewPath (webview: WebviewTag, path: string, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (new URL(webview.getURL()).pathname === path) {
      resolve()
      return
    }
    setTimeout(() => reject(new Error(`Timeout while waiting for webview path: ${path}`)), timeout)

    const listener = (): void => {
      webview.removeEventListener('dom-ready', listener)
      waitForWebviewPath(webview, path).then(resolve).catch(reject)
    }
    webview.addEventListener('dom-ready', listener)
  })
}

async function checkForReviewMessage (webview: WebviewTag, timeout = 10000): Promise<boolean> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout while waiting for webview review message')), timeout)
    const foundInPageListener = (event: FoundInPageEvent): void => {
      webview.removeEventListener('found-in-page', foundInPageListener)
      resolve(event.result.matches > 0)
    }

    const didFinishLoadListener = (): void => {
      webview.removeEventListener('did-finish-load', didFinishLoadListener)
      // This emits a 'found-in-page' event
      // see: https://electronjs.org/docs/api/webview-tag#webviewfindinpagetext-options
      webview.findInPage(ANCHOR_MANUAL_REVIEW_TEXT)
    }

    webview.addEventListener('did-finish-load', didFinishLoadListener)
    webview.addEventListener('found-in-page', foundInPageListener)
  })
}

const INSERT_CSS_DELAY = 500
const PLAID_TRANSITION_DELAY = 500
const CHECK_DOM_DELAY = 100
const CHECK_DOM_TIMEOUT = 10000

const DepositDialogInitialState: DepositDialogState = {
  webviewIsLoading: true,
  isPlaidOpen: false,
  loadingMessage: undefined,
  isDone: false,
  amountDeposited: undefined,
  instant: undefined,
  previousBalance: undefined
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
      logger.error(`Error while loading CSS for injection: ${e}`)
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
        logger.debug(`unknown message: ${data}`)
      }
    } catch (e) {
      logger.debug(`Bad format on ipc message: ${data}`)
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
          logger.debug(`Error while waiting for anchor to load: ${e.message}`)
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
      const prevBalance = this.state.previousBalance
      const amountDeposited = await this.getDepositAmount()
      const currBalance = await getBalanceState(Asset.USDX)

      if (currBalance instanceof Error) {
        throw currBalance
      }

      const prevBalanceVal = prevBalance instanceof Error || prevBalance === undefined ? 0 : prevBalance.value
      this.setState({
        amountDeposited,
        isDone: true,
        instant: Math.round(amountDeposited * centsPerUSD) === currBalance.value - prevBalanceVal
      })
    } catch (e) {
      logger.debug(`Error while getting deposit amount: ${e}`)
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
        onClick: openBeacon
      })
    }

    if (webviewUrl.pathname === ANCHOR_DASHBOARD_PATH) {
      const isManualReview = await checkForReviewMessage(webviewNode)
      if (!isManualReview) return

      return this.depositError(DEPOSIT_ERROR_MESSAGE.MANUAL_REVIEW)
    }

    if (webviewUrl.pathname !== ANCHOR_DEPOSIT_PATH) {
      return
    }

    const webviewCSS = await this.loadCSS()

    if (!webviewCSS) {
      logger.debug(`Error while loading CSS for webview`)
      return this.depositError()
    }

    webviewNode.insertCSS(webviewCSS)
    await delay(INSERT_CSS_DELAY)
    this.setState({ webviewIsLoading: false })
  }

  handleOpen = (): void => {
    this.handleWebview()

    // retrieve our current balance when the dialog is opened
    // so we know if the deposit was instant
    this.setState({
      previousBalance: balances[Asset.USDX]
    })
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
      logger.debug(`Error: Webview does not exist`)
      return this.depositError()
    }
    webviewNode.send('js:hideAnchorAmount')
  }

  showAnchorAmount (): void {
    const webviewNode = this.webviewRef.current
    if (!webviewNode) {
      logger.debug(`Error: Webview does not exist`)
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
      this.state.isDone ? 'done' : '',
      this.state.isPlaidOpen ? 'plaid' : ''
    ].filter(Boolean).join(' ')
  }

  get backdropClassName (): string {
    return this.state.isPlaidOpen ? 'plaid' : ''
  }

  renderNonWebviewContent (): ReactNode {
    if (this.state.isDone) {
      const amountDeposited = this.state.amountDeposited || 0

      if (this.state.instant) {
        return (
          <React.Fragment>
            <SpinnerSuccess
              size={Spinner.SIZE_LARGE}
              className='AnchorSpinner'
            />
            <p>Your ACH transfer of {formatDollarValue(amountDeposited)} USD has been credited to your account.</p>
          </React.Fragment>
        )
      }

      return (
        <React.Fragment>
          <p>Your ACH transfer of {formatDollarValue(amountDeposited)} USD has been initiated and will be posted to your account in a few days.</p>
          <p>You will receive an email from AnchorUSD once the transfer has been posted. Please <Button className="link-button" minimal={true} onClick={openBeacon}>contact us</Button> for more information.</p>
        </React.Fragment>
      )
    }

    if (this.state.webviewIsLoading) {
      return (
        <SpinnerMessage
          size={Spinner.SIZE_LARGE}
          className='AnchorSpinner'
          message={this.state.loadingMessage}
        />
      )
    }

    return (
      <React.Fragment>
        <p>In order to purchase BTC, you must transfer USD from your bank using our payment processing partner, <strong>AnchorUSD</strong>.</p>
        <p>Link your bank account and transfer your funds to AnchorUSD securely to continue.</p>
        <p>For more information on how USD is handled, please <Button className="link-button" minimal={true} onClick={openBeacon}>contact us</Button>.</p>
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
        onOpened={this.handleOpen}
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
        {this.state.isDone
          ? (
            <div className={Classes.DIALOG_FOOTER}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                  text="Done"
                  onClick={this.props.onDepositDone}
                  className='DoneButton'
                  fill={true}
                />
              </div>
            </div>
          )
          : ''
        }

      </Dialog>
    )
  }
}
