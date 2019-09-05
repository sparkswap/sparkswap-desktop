import React, { ReactNode } from 'react'
import './App.css'
import LNDConnect from './LNDConnect'
import PriceChart from './Prices'
import TradeHistory from './History'
import Trade from './Trade'
import {
  getRegistrationURL,
  DepositDialog,
  OnboardingStage,
  RegisterDialog
} from './Onboarding'
import Balances from './Balances'
import { showErrorToast, showSuccessToast, showLoadingToast } from './AppToaster'
import register from '../domain/register'
import { getBalanceState } from '../domain/balance'
import { getAuth, openLinkInBrowser } from '../domain/main-request'
import { ReviewStatus, URL, Asset } from '../../global-shared/types'
import { ReactComponent as Logo } from './assets/icon-dark.svg'
import { formatDollarValue } from './formatters'
import { IActionProps } from '@blueprintjs/core'

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

  async register (): Promise<OnboardingStep> {
    try {
      const { reviewStatus, url } = await register()

      switch (reviewStatus) {
        case ReviewStatus.UNCREATED:
        case ReviewStatus.CREATED:
          return { stage: OnboardingStage.REGISTER }
        case ReviewStatus.PENDING:
        case ReviewStatus.APPROVED:
          return { stage: OnboardingStage.DEPOSIT, depositUrl: url }
        default:
          console.debug(`Register returned status: ${reviewStatus}`)
          showErrorToast('Error during identity verification', {
            text: 'Contact support',
            onClick: () => openLinkInBrowser(
              'https://support.sparkswap.com/identity-verification-failed')
          })
          return { stage: OnboardingStage.NONE }
      }
    } catch (e) {
      console.error(`Register threw an error: ${e.message}`)
      showErrorToast('Error during identity verification', {
        text: 'Contact support',
        onClick: () => openLinkInBrowser(
          'https://support.sparkswap.com/identity-verification-error')
      })
      return { stage: OnboardingStage.NONE }
    }
  }

  async handleInitialOnboarding (): Promise<void> {
    this.setState({ depositLoading: true })

    const {
      stage,
      depositUrl
    } = await this.register()

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
      } = await this.register()

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

  startDeposit = async (): Promise<void> => {
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

  handleDepositDone = (amount: number): void => {
    showSuccessToast(`Transfer of ${formatDollarValue(amount)} USD initiated.`)
    getBalanceState(Asset.USDX)
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
        <LNDConnect />
        <RegisterDialog
          uuid={this.state.uuid}
          onClose={this.handleClose}
          onProceed={this.startDeposit}
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
            <Balances onDeposit={this.startDeposit} depositLoading={depositLoading} />
            <PriceChart />
          </div>
          <div className="vertical-line" />
          <div className="TradeAndHistory">
            <Trade onDeposit={this.startDeposit} />
            <TradeHistory />
          </div>
        </div>
      </div>
    )
  }
}

export default App
