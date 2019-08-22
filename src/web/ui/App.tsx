import React, { ReactNode } from 'react'
import './App.css'
import LNDConnect from './LNDConnect'
import PriceChart from './Prices'
import TradeHistory from './History'
import Trade from './Trade'
import { DepositDialog, OnboardingStage, RegisterDialog } from './Onboarding'
import Balances from './Balances'
import { toaster } from './AppToaster'
import register from '../domain/register'
import { ReviewStatus, URL } from '../../global-shared/types'
import { ReactComponent as Logo } from './assets/icon-dark.svg'

interface OnboardingStep {
  stage: OnboardingStage,
  depositUrl?: URL
}

interface AppState {
  onboardingStage: OnboardingStage,
  refreshScreen: boolean,
  depositLoading: boolean,
  depositUrl?: URL
}

class App extends React.Component<{}, AppState> {
  constructor (props: {}) {
    super(props)
    this.state = {
      onboardingStage: OnboardingStage.NONE,
      refreshScreen: true,
      depositLoading: false
    }
  }

  handleOverlayClose = () => {
    this.setState({
      refreshScreen: true
    })
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
        case ReviewStatus.REJECTED:
          // TODO: Create a nice screen for the user if they have been rejected
          // so that they dont hate us
          toaster.show({
            intent: 'danger',
            message: 'Error while registering: Please contact Sparkswap at support@sparkswap.com'
          })
          return { stage: OnboardingStage.NONE }
        default:
          toaster.show({
            intent: 'danger',
            message: `Error while registering: unknown status ${reviewStatus}`
          })
          return { stage: OnboardingStage.NONE }
      }
    } catch (e) {
      toaster.show({
        intent: 'danger',
        message: `Error while registering: ${e.message}`
      })
      return { stage: OnboardingStage.NONE }
    }
  }

  async handleInitialOnboarding (): Promise<void> {
    const toastId = toaster.show({
      intent: 'success',
      message: 'Starting deposit workflow',
      loading: true,
      timeout: 0,
      hideDismiss: true
    })

    this.setState({ depositLoading: true })

    const {
      stage,
      depositUrl
    } = await this.register()

    this.setState({
      onboardingStage: stage,
      depositUrl,
      depositLoading: false
    })

    toaster.dismiss(toastId)
  }

  async handleRegisterProceed (): Promise<void> {
    const {
      stage,
      depositUrl
    } = await this.register()

    if (stage === OnboardingStage.REGISTER) {
      toaster.show({
        intent: 'danger',
        message: 'You must first verify your identity before you can proceed to step 2.',
        timeout: 5000,
        hideDismiss: true
      })
    }

    this.setState({
      onboardingStage: stage,
      depositUrl
    })
  }

  startDeposit = async (): Promise<void> => {
    switch (this.state.onboardingStage) {
      case OnboardingStage.NONE:
        this.handleInitialOnboarding()
        return
      case OnboardingStage.REGISTER:
        this.handleRegisterProceed()
        return
      default:
        throw new Error('Unknown onboarding stage')
    }
  }

  handleClose = (): void => {
    this.setState({ onboardingStage: OnboardingStage.NONE })
  }

  render (): ReactNode {
    const {
      onboardingStage,
      depositLoading,
      refreshScreen,
      depositUrl
    } = this.state

    return (
      <div className="App">
        <div className="logo">
          <Logo width="100%" height="100%" />
        </div>
        <div className="chrome-title">
        </div>
        <LNDConnect onClose={this.handleOverlayClose} />
        <RegisterDialog
          onClose={this.handleClose}
          onProceed={this.startDeposit}
          isOpen={onboardingStage === OnboardingStage.REGISTER}
        />
        <DepositDialog
          depositUrl={depositUrl || ''}
          onClose={this.handleClose}
          isOpen={onboardingStage === OnboardingStage.DEPOSIT}
        />
        <div className="app-content">
          <div className="BalancesAndPrice">
            <Balances onDeposit={this.startDeposit} depositLoading={depositLoading} />
            <PriceChart redraw={refreshScreen} />
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
