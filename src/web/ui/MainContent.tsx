import React, { ReactNode } from 'react'
import {
  Spinner,
  Intent,
  Tabs,
  Tab,
  TabId
} from '@blueprintjs/core'
import {
  trades,
  updater as tradeUpdater,
  canLoadMore as canLoadMoreTrades
} from '../domain/history'
import { Trade } from '../../common/types'
import TradeHistory from './History'
import PriceChart from './Prices'
import StatusBadge from './components/StatusBadge'
import './MainContent.css'

interface MainContentState {
  trades: Trade[],
  canLoadMore: boolean,
  selectedTabId: TabId,
  userSelected: boolean,
  newHistory: boolean
}

function mapToArr (tradesMap: Map<number, Trade>): Trade[] {
  return Array.from(tradesMap.values()).sort((a, b) => {
    return b.id - a.id
  })
}

class MainContent extends React.Component<{}, MainContentState> {
  constructor (props: {}) {
    super(props)
    this.state = {
      trades: mapToArr(trades),
      canLoadMore: canLoadMoreTrades,
      selectedTabId: 'loading',
      userSelected: false,
      newHistory: false
    }
  }

  get hasNewHistory (): boolean {
    return this.state.newHistory && this.state.selectedTabId !== 'history'
  }

  updateTrades = (trades: Map<number, Trade>): void => {
    this.setState({
      trades: mapToArr(trades),
      canLoadMore: canLoadMoreTrades,
      newHistory: Boolean(trades.size) && this.state.selectedTabId !== 'history'
    })
  }

  updateTab = (trades: Map<number, Trade>): void => {
    // initialize the tab after trades load if the user has not already
    if (!this.state.userSelected) {
      if (trades.size) {
        this.setState({
          selectedTabId: 'history',
          newHistory: false
        })
      } else {
        this.setState({
          selectedTabId: 'prices'
        })
      }
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

  handleTabChange = (newTabId: TabId, oldTabId: TabId): void => {
    if (newTabId !== oldTabId) {
      this.setState({
        userSelected: true,
        selectedTabId: newTabId
      })
      if (newTabId === 'history') {
        this.setState({ newHistory: false })
      }
    }
  }

  renderHistoryTitle (): ReactNode {
    if (!this.hasNewHistory) {
      return 'Transactions'
    }

    return (
      <React.Fragment>
        Transactions
        <StatusBadge intent={Intent.PRIMARY} />
      </React.Fragment>
    )
  }

  render (): ReactNode {
    const {
      trades,
      canLoadMore,
      selectedTabId
    } = this.state

    return (
      <Tabs
        className='main-content-tabs'
        id='main-content-tabs'
        selectedTabId={selectedTabId}
        onChange={this.handleTabChange}
        large={true}
      >
        <Tab
          id='history'
          className={this.hasNewHistory ? 'history-tab new-history' : 'history-tab'}
          title={this.renderHistoryTitle()}
          panel={<TradeHistory trades={trades} canLoadMore={canLoadMore} />}
        />
        <Tab
          id='prices'
          title='Prices'
          panel={<PriceChart />}
        />
        <Tab
          id='loading'
          panelClassName='main-content-spinner'
          panel={<Spinner size={72} />}
        />
      </Tabs>
    )
  }
}

export default MainContent
