import React, { ReactNode } from 'react'
import { formatAsset, formatAmount } from '../../common/formatters'
import {
  Asset,
  Amount,
  LndBalances,
  AnchorBalances
} from '../../global-shared/types'
import {
  balances,
  balanceUpdater
} from '../domain/balance'
import { H4, H5, Button } from '@blueprintjs/core'
import PayInvoice from './PayInvoice'
import Balance from './Balance'
import './Balances.css'

interface BalanceSummaryProps {
  selectBalance: (asset: Asset) => void,
  onDeposit: (e: React.MouseEvent) => void,
  depositLoading: boolean
}

interface BalanceSummaryState {
  balances: {
    [Asset.BTC]: LndBalances | Error,
    [Asset.USDX]: AnchorBalances | Error
  }
}

class BalanceSummary extends React.Component<BalanceSummaryProps, BalanceSummaryState> {
  constructor (props: BalanceSummaryProps) {
    super(props)
    this.state = {
      balances
    }
  }

  onBalanceUpdate = (): void => {
    this.setState({ balances })
  }

  componentWillUnmount (): void {
    balanceUpdater.removeListener('update', this.onBalanceUpdate)
  }

  componentDidMount (): void {
    balanceUpdater.on('update', this.onBalanceUpdate)
  }

  totalAmount (asset: Asset): Amount | Error {
    const assetBalances = this.state.balances[asset]

    if (assetBalances instanceof Error) {
      return assetBalances
    }

    if (asset === Asset.USDX) {
      return (assetBalances as AnchorBalances).available
    }

    return assetBalances.total
  }

  renderAction (asset: Asset): ReactNode {
    if (asset === Asset.USDX) {
      return (
        <Button
          small
          onClick={(e: React.MouseEvent): void => this.props.onDeposit(e)}
          loading={this.props.depositLoading}
        >
          Deposit
        </Button>
      )
    }

    if (asset === Asset.BTC) {
      return (
        <PayInvoice
          small
          title='Send'
          onDeposit={this.props.onDeposit}
          onInvoiceSuccess={() => this.props.selectBalance(Asset.BTC)}
        />
      )
    }

    return null
  }

  maybeRenderHolds (asset: Asset): ReactNode {
    if (asset !== Asset.USDX) {
      return
    }

    const usdxBalances = this.state.balances[asset]

    if (usdxBalances instanceof Error) {
      return
    }

    return (
      <span className='subtitle'>
        {formatAmount(usdxBalances.holds)} Holds
      </span>
    )
  }

  renderAsset (asset: Asset): ReactNode {
    return (
      <div className='single-balance'>
        <H5>
          <a
            href={`#main-content-${asset}`}
            onClick={() => this.props.selectBalance(asset)}
          >
            <div className='asset'>
              {formatAsset(asset)}
            </div>
            <div className='info'>
              <Balance
                asset={asset}
                amount={this.totalAmount(asset)}
                showConverted={asset === Asset.BTC}
              />
              {this.maybeRenderHolds(asset)}
            </div>
          </a>
          <div className='actions'>
            {this.renderAction(asset)}
          </div>
        </H5>
      </div>
    )
  }

  render (): ReactNode {
    return (
      <div className='Balances'>
        <H4>Balances</H4>
        {this.renderAsset(Asset.BTC)}
        {this.renderAsset(Asset.USDX)}
      </div>
    )
  }
}

export default BalanceSummary
