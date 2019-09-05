import React, { ReactNode } from 'react'
import { formatAmount } from './formatters'
import { Asset } from '../../global-shared/types'
import { balances, balanceUpdater, BalanceState } from '../domain/balance'
import { Classes, H4, H5, Button } from '@blueprintjs/core'
import './Balances.css'

interface BalanceProps {
  onDeposit: (e: React.MouseEvent) => void,
  depositLoading: boolean
}

interface BalancesState {
  BTC: BalanceState,
  USDX: BalanceState,
  [asset: string]: BalanceState
}

const ASSET_DISPLAY_SYMBOL = {
  [Asset.BTC]: 'BTC',
  [Asset.USDX]: 'USD'
}

class Balances extends React.Component<BalanceProps, BalancesState> {
  constructor (props: BalanceProps) {
    super(props)
    this.state = {
      [Asset.BTC]: balances[Asset.BTC],
      [Asset.USDX]: balances[Asset.BTC]
    }
  }

  componentDidMount (): void {
    balanceUpdater.on('update', () => {
      this.setState({
        [Asset.BTC]: balances[Asset.BTC],
        [Asset.USDX]: balances[Asset.USDX]
      })
    })
  }

  renderAmount (state: BalanceState): ReactNode {
    const className = [state instanceof Error ? Classes.SKELETON : '', 'balance-amount'].join(' ')
    const value = state instanceof Error ? '0.00000000' : formatAmount(state)

    return (
      <span className={className}>
        {value}
      </span>
    )
  }

  renderBalance (asset: Asset): ReactNode {
    return (
      <span>
        {this.renderAmount(this.state[asset])}
        &nbsp;{ASSET_DISPLAY_SYMBOL[asset]}
      </span>
    )
  }

  render (): ReactNode {
    return (
      <div className="Balances">
        <H4>Balances</H4>
        <div className='balances-row'>
          <H5 className='single-balance'>
            {this.renderBalance(Asset.BTC)}
          </H5>
          <H5 className='single-balance'>
            {this.renderBalance(Asset.USDX)}
            <Button onClick={this.props.onDeposit} loading={this.props.depositLoading} small={true}>Deposit</Button>
          </H5>
        </div>
      </div>
    )
  }
}

export default Balances
