import React, { ReactNode } from 'react'
import {
  Spinner,
  Intent,
  Tabs,
  Tab,
  TabId as bpTabId
} from '@blueprintjs/core'
import {
  trades,
  updater as tradeUpdater,
  canLoadMore as canLoadMoreTrades
} from '../domain/history'
import { Asset } from '../../global-shared/types'
import { Trade } from '../../common/types'
import TradeHistory from './trade-history/TradeHistory'
import PriceChart from './Prices'
import Account from './account/Account'
import StatusBadge from './components/StatusBadge'
import { formatAsset } from '../../common/formatters'
import './MainContent.css'

export type TabId = bpTabId

export enum TabIds {
  trades = 'trades',
  usdAccount = 'usd-account',
  btcAccount = 'btc-account',
  prices = 'prices',
  loading = 'loading'
}

interface MainContentProps {
  onDeposit: (e: React.MouseEvent) => void,
  depositLoading: boolean,
  onTabChange: (tab: TabId) => void,
  selectBalance: (asset: Asset) => void,
  selectedTabId?: TabId
}

interface MainContentState {
  trades: Trade[],
  canLoadMore: boolean,
  defaultTabId: TabId,
  newHistory: boolean,
  accountAsset: Asset
}

function mapToArr (tradesMap: Map<number, Trade>): Trade[] {
  return Array.from(tradesMap.values()).sort((a, b) => {
    return b.id - a.id
  })
}

class MainContent extends React.Component<MainContentProps, MainContentState> {
  constructor (props: MainContentProps) {
    super(props)
    this.state = {
      trades: mapToArr(trades),
      canLoadMore: canLoadMoreTrades,
      defaultTabId: TabIds.loading,
      newHistory: false,
      accountAsset: Asset.BTC
    }
  }

  get selectedTabId (): TabId {
    if (this.props.selectedTabId) {
      return this.props.selectedTabId
    }

    return this.state.defaultTabId
  }

  updateTrades = (trades: Map<number, Trade>): void => {
    this.setState({
      trades: mapToArr(trades),
      canLoadMore: canLoadMoreTrades,
      newHistory: Boolean(trades.size) && this.selectedTabId !== TabIds.trades
    })
  }

  updateTab = (trades: Map<number, Trade>): void => {
    // initialize the default state of the component after
    // trades have loaded
    if (trades.size) {
      this.setState({
        defaultTabId: TabIds.trades,
        newHistory: false
      })
    } else {
      this.setState({
        defaultTabId: TabIds.prices
      })
    }
  }

  componentDidMount (): void {
    tradeUpdater.on('update', this.updateTrades)
    tradeUpdater.once('update', this.updateTab)
  }

  componentWillUnmount (): void {
    tradeUpdater.removeListener('update', this.updateTrades)
    tradeUpdater.removeListener('update', this.updateTab)
  }

  renderHistoryTitle (): ReactNode {
    const historyTitle = 'Trades'

    if (!this.state.newHistory) {
      return historyTitle
    }

    return (
      <React.Fragment>
        {historyTitle}
        <StatusBadge intent={Intent.PRIMARY} />
      </React.Fragment>
    )
  }

  onTabChange = (tab: TabId): void => {
    if (tab === TabIds.trades) {
      this.setState({ newHistory: false })
    }
    this.props.onTabChange(tab)
  }

  render (): ReactNode {
    const {
      trades,
      canLoadMore
    } = this.state

    return (
      <Tabs
        className='main-content-tabs'
        id='main-content-tabs'
        selectedTabId={this.selectedTabId}
        onChange={this.onTabChange}
        large={true}
      >
        <Tab
          id={TabIds.trades}
          className={this.state.newHistory ? 'history-tab new-history' : 'history-tab'}
          panel={
            <TradeHistory
              trades={trades}
              canLoadMore={canLoadMore}
            />
          }
        >
          {this.renderHistoryTitle()}
        </Tab>
        <Tab
          id={TabIds.btcAccount}
          panel={
            <Account
              asset={Asset.BTC}
              onDeposit={this.props.onDeposit}
              depositLoading={this.props.depositLoading}
              selectBalance={this.props.selectBalance}
            />
          }
        >
          {formatAsset(Asset.BTC)} Account
        </Tab>
        <Tab
          id={TabIds.usdAccount}
          panel={
            <Account
              asset={Asset.USDX}
              onDeposit={this.props.onDeposit}
              depositLoading={this.props.depositLoading}
              selectBalance={this.props.selectBalance}
            />
          }
        >
          {formatAsset(Asset.USDX)} Account
        </Tab>
        <Tab
          id={TabIds.prices}
          title='Prices'
          panel={<PriceChart />}
        />
        <Tab
          id={TabIds.loading}
          panelClassName='main-content-spinner'
          panel={<Spinner size={72} />}
        />
      </Tabs>
    )
  }
}

export default MainContent
