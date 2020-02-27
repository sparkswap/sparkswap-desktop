import React, { ReactNode } from 'react'
import {
  HTMLTable,
  Button,
  Tabs,
  Tab
} from '@blueprintjs/core'
import logger from '../../../global-shared/logger'
import {
  Asset,
  Transaction,
  Channel,
  LndBalances,
  AnchorBalances
} from '../../../global-shared/types'
import { delay } from '../../../global-shared/util'
import { formatAsset } from '../../../common/formatters'
import { RequestChannelStatus } from '../../../common/types'
import {
  getTransactions,
  getChannels,
  requestChannel
} from '../../domain/main-request'
import {
  balances,
  balanceUpdater
} from '../../domain/balance'
import Balance from '../Balance'
import PayInvoice from '../PayInvoice'
import EmptyableList from '../components/EmptyableList'
import InlineTooltip from '../components/InlineTooltip'
import TransactionCard from './TransactionCard'
import ChannelCard from './ChannelCard'
import {
  showSuccessToast,
  showSupportToast,
  showErrorToast
} from '../AppToaster'
import './Account.css'

const GET_TX_DELAY = 5000
const GET_CHAN_DELAY = 5000

interface AccountProps {
  asset: Asset,
  onDeposit: (e: React.MouseEvent) => void,
  depositLoading: boolean,
  selectBalance: (asset: Asset) => void
}

interface AccountState {
  transactions: Transaction[],
  channels: Channel[],
  balances: {
    [Asset.BTC]: LndBalances | Error,
    [Asset.USDX]: AnchorBalances | Error
  },
  isRequestingChannel: boolean
}

enum TabIds {
  transactions = 'transactions',
  channels = 'channels'
}

class Account extends React.Component<AccountProps, AccountState> {
  private _isMounted: boolean

  constructor (props: AccountProps) {
    super(props)
    this._isMounted = false
    this.state = {
      transactions: [],
      channels: [],
      balances,
      isRequestingChannel: false
    }
  }

  async updateBtcChansForever (): Promise<void> {
    do {
      try {
        const channels = await getChannels()
        this.setState({ channels })
      } catch (e) {
        logger.debug(`Error while retrieving channels: ${e.message}, retrying in ${GET_CHAN_DELAY}ms`)
      }
    } while (this._isMounted && await delay(GET_CHAN_DELAY))
  }

  async updateBtcTxForever (): Promise<void> {
    do {
      try {
        const transactions = await getTransactions(Asset.BTC)
        this.setState({ transactions })
      } catch (e) {
        logger.debug(`Error while retrieving transactions: ${e.message}, retrying in ${GET_TX_DELAY}ms`)
      }
    } while (this._isMounted && await delay(GET_TX_DELAY))
  }

  async forceUpdateChannels (): Promise<void> {
    try {
      const channels = await getChannels()
      this.setState({ channels })
    } catch (e) {
      logger.debug(`Failed to force update of channels: ${e.toString()}`)
    }
  }

  async forceUpdateTransactions (): Promise<void> {
    try {
      const transactions = await getTransactions(this.props.asset)
      this.setState({ transactions })
    } catch (e) {
      logger.debug(`Error while retrieving transactions: ${e.message}.`)
    }
  }

  onBalanceUpdate = (manualUpdate: boolean): void => {
    if (manualUpdate && this.props.asset === Asset.BTC) {
      this.forceUpdateChannels()
      this.forceUpdateTransactions()
    } else {
      // We only need to update transactions for USDx because Anchor does not
      // have a convention for channels
      this.forceUpdateTransactions()
    }

    this.setState({ balances })
  }

  componentDidMount (): void {
    this._isMounted = true

    // We only need to update txs and chans at an interval for BTC as the only
    // way that USD transactions update our through our UI
    if (this.props.asset === Asset.BTC) {
      this.updateBtcTxForever()
      this.updateBtcChansForever()
    }

    balanceUpdater.on('update', this.onBalanceUpdate)
  }

  componentWillUnmount (): void {
    this._isMounted = false
    balanceUpdater.removeListener('update', this.onBalanceUpdate)
  }

  async requestChannel (): Promise<void> {
    try {
      this.setState({ isRequestingChannel: true })
      const res = await requestChannel()

      switch (res) {
        case RequestChannelStatus.SUCCESS:
          return showSuccessToast('Successfully requested new channel from Sparkswap')
        case RequestChannelStatus.EXISTING_CHANNEL:
          return showSupportToast('Channel with Sparkswap already exists')
        case RequestChannelStatus.NOT_APPROVED:
          return showErrorToast('Must be approved to request channel', {
            text: 'Deposit',
            onClick: this.props.onDeposit
          })
        case RequestChannelStatus.FAILED:
          return showSupportToast('Failed to open channel')
      }
    } catch (e) {
      showSupportToast('Failed to open channel')
    } finally {
      this.setState({ isRequestingChannel: false })
    }
  }

  renderActions (): ReactNode {
    if (this.props.asset === Asset.BTC) {
      return (
        <React.Fragment>
          <Button
            onClick={() => this.requestChannel()}
            loading={this.state.isRequestingChannel}
            className='request-channel'
          >
            Request Channel
          </Button>
          <PayInvoice
            title={`Send ${this.props.asset}`}
            onDeposit={this.props.onDeposit}
            onInvoiceSuccess={() => this.props.selectBalance(Asset.BTC)}
          />
        </React.Fragment>
      )
    }

    if (this.props.asset === Asset.USDX) {
      return (
        <Button
          onClick={this.props.onDeposit}
          loading={this.props.depositLoading}
        >
          Deposit {formatAsset(this.props.asset)}
        </Button>
      )
    }

    return null
  }

  maybeRenderChannels (): ReactNode {
    if (this.props.asset !== Asset.BTC) {
      return
    }

    return (
      <Tab
        id={TabIds.channels}
        panel={
          <EmptyableList
            className='TabContent Channels'
            name='channels'
            longName='Lightning Channels'
          >
            {this.state.channels.map(chan => {
              return <ChannelCard key={chan.id} channel={chan} forceUpdate={() => this.forceUpdateChannels()} />
            })}
          </EmptyableList>
        }
      >
        Channels
      </Tab>
    )
  }

  renderTableHeaders (): ReactNode {
    if (this.props.asset === Asset.USDX) {
      return (
        <tr>
          <th>Total Balance</th>
          <th>Available</th>
          <th>
            <InlineTooltip content={
              'Pending deposits and trades'
            }>
              Holds
            </InlineTooltip>
          </th>
        </tr>
      )
    }

    if (this.props.asset === Asset.BTC) {
      // TODO: add note about which balances can be used for
      // trading once we add sell support
      return (
        <tr>
          <th>Total Balance</th>
          <th>
            <InlineTooltip content={
              'Available to be spent on the Lightning Network'
            }>
              Lightning
            </InlineTooltip>
          </th>
          <th>
            <InlineTooltip content={
              'Available to be sent using on-chain Bitcoin transactions'
            }>
              On-chain
            </InlineTooltip>
          </th>
          <th>
            <InlineTooltip content={
              'Pending transactions and amounts in channel reserves'
            }>
              Holds
            </InlineTooltip>
          </th>
        </tr>
      )
    }
  }

  renderTableBalances (): ReactNode {
    const { asset } = this.props
    const { balances } = this.state
    const assetBalances = balances[asset]

    const totalBalance = assetBalances instanceof Error
      ? assetBalances
      : assetBalances.total
    const holdsBalance = assetBalances instanceof Error
      ? assetBalances
      : assetBalances.holds

    if (asset === Asset.USDX) {
      const usdxBalances = balances[Asset.USDX]
      const availableAmount = usdxBalances instanceof Error
        ? usdxBalances
        : usdxBalances.available

      return (
        <tr>
          <td>
            <Balance
              asset={asset}
              amount={totalBalance}
              showConverted
            />
          </td>
          <td>
            <Balance
              asset={asset}
              amount={availableAmount}
              showConverted
            />
          </td>
          <td>
            <Balance
              asset={asset}
              amount={holdsBalance}
              showConverted
            />
          </td>
        </tr>
      )
    }

    if (asset === Asset.BTC) {
      const btcBalances = balances[Asset.BTC]
      const lightningAmount = btcBalances instanceof Error
        ? btcBalances
        : btcBalances.lightning
      const onChainAmount = btcBalances instanceof Error
        ? btcBalances
        : btcBalances.onChain

      return (
        <tr>
          <td>
            <Balance
              asset={asset}
              amount={totalBalance}
              showConverted
            />
          </td>
          <td>
            <Balance
              asset={asset}
              amount={lightningAmount}
              showConverted
            />
          </td>
          <td>
            <Balance
              asset={asset}
              amount={onChainAmount}
              showConverted
            />
          </td>
          <td>
            <Balance
              asset={asset}
              amount={holdsBalance}
              showConverted
            />
          </td>
        </tr>
      )
    }
  }

  render (): ReactNode {
    return (
      <div className='Account'>
        <div className='account-actions'>
          {this.renderActions()}
        </div>
        <HTMLTable className='balance-details'>
          <thead>
            {this.renderTableHeaders()}
          </thead>
          <tbody>
            {this.renderTableBalances()}
          </tbody>
        </HTMLTable>
        <Tabs
          defaultSelectedTabId={TabIds.transactions}
        >
          <Tab
            id={TabIds.transactions}
            title='Transactions'
            panel={
              <EmptyableList
                className='TabContent Transactions'
                name='transactions'
                longName={`${formatAsset(this.props.asset)} transactions`}
              >
                {this.state.transactions.map(tx => <TransactionCard key={tx.id} transaction={tx} />)}
              </EmptyableList>
            }
          />
          {this.maybeRenderChannels()}
        </Tabs>
      </div>
    )
  }
}

export default Account
