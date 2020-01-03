import React, { ReactNode } from 'react'
import { formatAmount, formatAsset } from './formatters'
import { Asset } from '../../global-shared/types'
import { balances, balanceUpdater, BalanceState } from '../domain/balance'
import { marketDataSubscriber } from '../domain/market-data'
import { altAmount, altAsset } from '../domain/convert-amount'
import { Classes, H4, H5, Button } from '@blueprintjs/core'
import PayInvoice from './PayInvoice'
import './Balances.css'

interface BalanceProps {
  onDeposit: (e: React.MouseEvent) => void,
  depositLoading: boolean
}

interface BalancesState {
  balances: {
    BTC: BalanceState,
    USDX: BalanceState,
    [asset: string]: BalanceState
  },
  updated: {
    BTC: boolean,
    USDX: boolean,
    [asset: string]: boolean
  },
  currentPrice: number | null
}

class Balances extends React.Component<BalanceProps, BalancesState> {
  constructor (props: BalanceProps) {
    super(props)
    this.state = {
      balances: {
        [Asset.BTC]: balances[Asset.BTC],
        [Asset.USDX]: balances[Asset.BTC]
      },
      updated: {
        [Asset.BTC]: false,
        [Asset.USDX]: false
      },
      currentPrice: marketDataSubscriber.currentPrice
    }
  }

  private isBalanceChange (oldBalance: BalanceState, newBalance: BalanceState): boolean {
    if (oldBalance instanceof Error || newBalance instanceof Error) {
      return false
    }
    return oldBalance.value !== newBalance.value
  }

  onData = (): void => {
    const { currentPrice } = marketDataSubscriber
    this.setState({ currentPrice })
  }

  componentWillUnmount (): void {
    marketDataSubscriber.removeListener('update', this.onData)
  }

  componentDidMount (): void {
    marketDataSubscriber.on('update', this.onData)
    balanceUpdater.on('update', () => {
      const oldBalances = this.state.balances
      const updatedBTC = this.isBalanceChange(oldBalances[Asset.BTC], balances[Asset.BTC])
      const updatedUSDX = this.isBalanceChange(oldBalances[Asset.USDX], balances[Asset.USDX])

      this.setState({
        balances: {
          [Asset.BTC]: balances[Asset.BTC],
          [Asset.USDX]: balances[Asset.USDX]
        },
        updated: {
          [Asset.BTC]: updatedBTC || this.state.updated[Asset.BTC],
          [Asset.USDX]: updatedUSDX || this.state.updated[Asset.USDX]
        }
      })

      // use 2s for removing 1s animation to ensure animation doesnt get cut off
      if (updatedBTC) {
        setTimeout(() => this.setState(Object.assign(this.state, {
          updated: { [Asset.BTC]: false }
        })), 2000)
      }

      if (updatedUSDX) {
        setTimeout(() => this.setState(Object.assign(this.state, {
          updated: { [Asset.USDX]: false }
        })), 2000)
      }
    })
  }

  renderConverted (asset: Asset): ReactNode {
    const balance = this.state.balances[asset]
    const currentPrice = this.state.currentPrice

    if (balance instanceof Error || currentPrice === null) {
      return
    }

    return (
      <span className='subtitle'>
        &asymp;&nbsp;{formatAmount(altAmount(balance, currentPrice))}
        &nbsp;{formatAsset(altAsset(asset))}
      </span>
    )
  }

  renderAmount (asset: Asset): ReactNode {
    const balance = this.state.balances[asset]
    const className = [
      balance instanceof Error ? Classes.SKELETON : '',
      !(balance instanceof Error) && this.state.updated[asset]
        ? 'PulseBalance' : '',
      'balance-amount'
    ].join(' ')
    const value = balance instanceof Error ? '0.00000000' : formatAmount(balance)

    return (
      <span className={className}>
        {value}
      </span>
    )
  }

  renderBalance (asset: Asset): ReactNode {
    return (
      <span>
        {this.renderAmount(asset)}
        &nbsp;{formatAsset(asset)}
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
            <PayInvoice onDeposit={this.props.onDeposit} />
            {this.renderConverted(Asset.BTC)}
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
