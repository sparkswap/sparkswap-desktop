import React, { ReactNode } from 'react'
import logger from '../../global-shared/logger'
import './App.css'
import LNDConnect from './LNDConnect'
import PriceChart from './Prices'
import TradeHistory from './History'
import DownloadProgress from './DownloadProgress'
import Trade from './Trade'
import {
  getRegistrationURL,
  RegisterDialog,
  DepositDialog,
  OnboardingStage
} from './onboarding'
import { openBeacon } from './beacon'
import Balances from './Balances'
import { showErrorToast, showLoadingToast } from './AppToaster'
import * as lnd from '../domain/lnd'
import register from '../domain/register'
import { getStatus } from '../domain/server'
import { getAuth, openLinkInBrowser, startDeposit } from '../domain/main-request'
import { ReviewStatus, URL } from '../../global-shared/types'
import { ReactComponent as Logo } from './assets/icon-dark.svg'
import { Button, IActionProps } from '@blueprintjs/core'

interface OnboardingStep {
  stage: OnboardingStage,
  depositUrl?: URL
}

interface AppState {
  onboardingStage: OnboardingStage,
  depositLoading: boolean,
  showSteps: boolean,
  depositUrl?: URL,
  uuid?: string
}

class App extends React.Component<{}, AppState> {
  constructor (props: {}) {
    super(props)
    this.state = {
      onboardingStage: OnboardingStage.NONE,
      depositLoading: false,
      showSteps: true
    }
    this.updateUUID()
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

      const { reviewStatus } = await getStatus()

      switch (reviewStatus) {
        case ReviewStatus.UNCREATED:
        case ReviewStatus.CREATED:
        case ReviewStatus.INCOMPLETE:
          return { stage: OnboardingStage.REGISTER }
        case ReviewStatus.PENDING:
        case ReviewStatus.APPROVED:
          return {
            stage: OnboardingStage.DEPOSIT,
            depositUrl: await startDeposit()
          }
        default:
          throw new Error(`Invalid review status: ${reviewStatus}`)
      }
    } catch (e) {
      logger.error(`Error getting onboarding stage: ${e}`)
      showErrorToast('Error during identity verification', {
        text: 'Contact support',
        onClick: openBeacon
      })
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
      showErrorToast('Error during initial registration', {
        text: 'Contact support',
        onClick: openBeacon
      })
    }

    const {
      stage,
      depositUrl
    } = await this.getOnboardingStep()

    this.setState({
      onboardingStage: stage,
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
        depositUrl
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
        <RegisterDialog
          uuid={this.state.uuid}
          onClose={this.handleClose}
          onProceed={this.handleDeposit}
          isOpen={onboardingStage === OnboardingStage.REGISTER}
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
            <TradeHistory />
          </div>
        </div>
        <Button className='help-link' icon='help' minimal={true} onClick={openBeacon} />
      </div>
    )
  }
}

export default App
