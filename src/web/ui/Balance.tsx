import React, { ReactNode } from 'react'
import { Asset, Amount } from '../../global-shared/types'
import { formatAmount } from '../../common/formatters'
import { DisplayValue, PulseColor } from './components/DisplayValue'
import ConvertedValue from './components/ConvertedValue'

const PLACEHOLDER = '0.00000000'

interface BalanceProps {
  asset: Asset,
  amount: Amount | Error,
  showConverted?: boolean
}

interface BalanceComponentState {
  updated: boolean
}

class Balance extends React.Component<BalanceProps, BalanceComponentState> {
  constructor (props: BalanceProps) {
    super(props)
    this.state = {
      updated: false
    }
  }

  componentDidUpdate (prevProps: BalanceProps): void {
    if (prevProps.asset !== this.props.asset) {
      return
    }

    if (prevProps.amount instanceof Error) {
      if (!(this.props.amount instanceof Error)) {
        this.setState({ updated: true })
      }
      return
    }

    if (this.props.amount instanceof Error ||
        prevProps.amount.value !== this.props.amount.value) {
      this.setState({ updated: true })
    }
  }

  renderConverted (): ReactNode {
    if (!this.props.showConverted) {
      return null
    }

    return (
      <ConvertedValue
        className='subtitle'
        amount={this.props.amount}
      />
    )
  }

  render (): ReactNode {
    const { amount } = this.props
    const { updated } = this.state

    const isLoading = amount instanceof Error
    const displayVal = amount instanceof Error ? PLACEHOLDER : formatAmount(amount)

    return (
      <React.Fragment>
        <DisplayValue
          className='balance-amount'
          loading={isLoading}
          pulseColor={updated ? PulseColor.Gray : null}
          resetPulse={() => this.setState({ updated: false })}
        >
          {displayVal}
        </DisplayValue>
        {this.renderConverted()}
      </React.Fragment>
    )
  }
}

export default Balance
