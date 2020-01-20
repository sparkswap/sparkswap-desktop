import { EventEmitter } from 'events'
import React, { ReactNode } from 'react'
import logger from '../../global-shared/logger'
import './App.css'
import LNDConnect from './LNDConnect'
import PriceChart from './Prices'
import TradeHistory from './History'
import DownloadProgress from './DownloadProgress'
import Trade from './Trade'
import DCA, { getSuccessMessage } from './dca/DCA'
import { subscribeRecurringBuys } from '../domain/dca'
import {
  getRegistrationURL,
  RegisterDialog,
  DepositDialog,
  OnboardingStage
} from './Onboarding'
import { openBeacon } from './beacon'
import Balances from './Balances'
import { showErrorToast, showSupportToast, showLoadingToast, showSuccessToast, toaster } from './AppToaster'
import * as lnd from '../domain/lnd'
import register from '../domain/register'
import { getStatus } from '../domain/server'
import { getAuth, openLinkInBrowser, startDeposit, sendAppNotification } from '../domain/main-request'
import { ReviewStatus, URL } from '../../global-shared/types'
import { ReactComponent as Logo } from './assets/icon-dark.svg'
import { Button, IActionProps, Intent } from '@blueprintjs/core'
import { ProofOfKeysDialog } from './proof-of-keys-dialog'
import { BalanceError } from '../../common/errors'
import { delay } from '../../global-shared/util'

// Delay so that our notification appears instead of Zap's
// which is less informative
const OS_NTFN_DELAY = 500

interface OnboardingStep {
  stage: OnboardingStage,
  depositUrl?: URL,
  version?: number
}

interface AppState {
  onboardingStage: OnboardingStage,
  onboardingVersion?: number,
  depositLoading: boolean,
  showSteps: boolean,
  depositUrl?: URL,
  uuid?: string
}

class App extends React.Component<{}, AppState> {
  recurringBuySubscriber: EventEmitter

  constructor (props: {}) {
    super(props)
    this.state = {
      onboardingStage: OnboardingStage.NONE,
      depositLoading: false,
      showSteps: true
    }
    this.updateUUID()
    this.recurringBuySubscriber = subscribeRecurringBuys()
  }

  componentDidMount (): void {
    this.recurringBuySubscriber.on('success', async (message: string): Promise<void> => {
      showSuccessToast(message)
      await delay(OS_NTFN_DELAY)
      sendAppNotification({
        title: message,
        message: getSuccessMessage()
      })
    })
    this.recurringBuySubscriber.on('error', async (error: Error): Promise<void> => {
      if (error instanceof BalanceError) {
        toaster.show({
          intent: Intent.DANGER,
          message: error.message,
          action: {
            onClick: () => this.handleDeposit(),
            text: 'Deposit'
          }
        })
      } else {
        showErrorToast(error.message)
      }

      await delay(OS_NTFN_DELAY)
      sendAppNotification({
        title: 'Failed to execute recurring buy',
        message: error.message
      })
    })
  }

  async updateUUID (): Promise<void> {
    const { uuid } = await getAuth()
    this.setState({ uuid })
  }

  async getOnboardingStep (): Promise<OnboardingStep> {
    try {
      const lndStatus = await lnd.getStatus()
      const { VALIDATED, NOT_SYNCED } = lnd.Statuses

      if (lndStatus !== VALIDATED && lndStatus !== NOT_SYNCED) {
        showErrorToast(`Connect to LND before depositing`)
        return { stage: OnboardingStage.NONE }
      }

      const { reviewStatus, version } = await getStatus()

      switch (reviewStatus) {
        case ReviewStatus.UNCREATED:
        case ReviewStatus.CREATED:
        case ReviewStatus.INCOMPLETE:
          return {
            stage: OnboardingStage.REGISTER,
            version
          }
        case ReviewStatus.PENDING:
          if (version && version > 0) {
            showSuccessToast('Your application is pending review', {
              text: 'Get an update',
              onClick: openBeacon
            })
            return { stage: OnboardingStage.NONE }
          }
          // for version 0 users (legacy KYC) we go to deposit even if application is pending
          return {
            stage: OnboardingStage.DEPOSIT,
            depositUrl: await startDeposit(),
            version
          }
        case ReviewStatus.APPROVED:
          return {
            stage: OnboardingStage.DEPOSIT,
            depositUrl: await startDeposit(),
            version
          }
        default:
          throw new Error(`Invalid review status: ${reviewStatus}`)
      }
    } catch (e) {
      logger.error(`Error getting onboarding stage: ${e}`)
      showSupportToast('Error during identity verification')
      return { stage: OnboardingStage.NONE }
    }
  }

  async handleInitialOnboarding (): Promise<void> {
    this.setState({ depositLoading: true })

    try {
      // this will register us with the server the first time
      // through, afterward it will be a no-op
      await register()
    } catch (e) {
      logger.error(`Error registering: ${e}`)
      showSupportToast('Error during initial registration')
    }

    const {
      stage,
      depositUrl,
      version
    } = await this.getOnboardingStep()

    this.setState({
      onboardingStage: stage,
      onboardingVersion: version,
      depositUrl,
      depositLoading: false,
      showSteps: false
    })
  }

  async handleRegisterProceed (): Promise<void> {
    const dismissLoader = showLoadingToast('Verifying identity')

    try {
      const {
        stage,
        depositUrl,
        version
      } = await this.getOnboardingStep()

      if (stage === OnboardingStage.REGISTER) {
        const uuid = this.state.uuid
        showErrorToast('Verify your identity before proceeding to Step 2.',
          uuid ? {
            text: 'Verify',
            onClick: () => openLinkInBrowser(getRegistrationURL(uuid))
          } : undefined)
      }

      this.setState({
        onboardingStage: stage,
        onboardingVersion: version,
        depositUrl,
        showSteps: true
      })
    } finally {
      dismissLoader()
    }
  }

  handleDeposit = async (): Promise<void> => {
    switch (this.state.onboardingStage) {
      case OnboardingStage.NONE:
        await this.handleInitialOnboarding()
        return
      case OnboardingStage.REGISTER:
        await this.handleRegisterProceed()
        return
      default:
        throw new Error('Unknown onboarding stage')
    }
  }

  handleDepositDone = (): void => {
    this.handleClose()
  }

  handleDepositError = (message: string, action?: IActionProps): void => {
    showErrorToast(message, action)
    this.handleClose()
  }

  handleClose = (): void => {
    this.setState({ onboardingStage: OnboardingStage.NONE })
  }

  render (): ReactNode {
    const {
      onboardingStage,
      onboardingVersion,
      depositLoading,
      depositUrl,
      showSteps
    } = this.state

    return (
      <div className="App">
        <div className="logo">
          <Logo width="100%" height="100%" />
        </div>
        <div className="chrome-title">
        </div>
        <DownloadProgress />
        <LNDConnect />
        <ProofOfKeysDialog />
        <RegisterDialog
          uuid={this.state.uuid}
          onClose={this.handleClose}
          onProceed={this.handleDeposit}
          isOpen={onboardingStage === OnboardingStage.REGISTER}
          onboardingVersion={onboardingVersion}
        />
        <DepositDialog
          depositUrl={depositUrl || ''}
          onClose={this.handleClose}
          isOpen={onboardingStage === OnboardingStage.DEPOSIT}
          onDepositDone={this.handleDepositDone}
          onDepositError={this.handleDepositError}
          showSteps={showSteps}
        />
        <div className="app-content">
          <div className="BalancesAndPrice">
            <Balances onDeposit={this.handleDeposit} depositLoading={depositLoading} />
            <PriceChart />
          </div>
          <div className="vertical-line" />
          <div className="TradeAndHistory">
            <Trade onDeposit={this.handleDeposit} />
            <DCA recurringBuySubscriber={this.recurringBuySubscriber} />
            <TradeHistory />
          </div>
        </div>
        <Button className='help-link' icon='help' minimal={true} onClick={openBeacon} />
      </div>
    )
  }
}

export default App
