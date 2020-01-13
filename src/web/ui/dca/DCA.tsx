import { EventEmitter } from 'events'
import React, { ReactNode } from 'react'
import {
  H4,
  HTMLTable,
  Button
} from '@blueprintjs/core'
import { RecurringBuyRow } from './RecurringBuyRow'
import { DCADialog } from './DCADialog'
import { recurringBuys } from '../../domain/dca'
import { RecurringBuy } from '../../../common/types'
import './DCA.css'

const SUCCESS_MESSAGES = [
  'Successfully purchased Bitcoin on schedule. DCA much?',
  'The satoshis are already in your wallet. Yes, really.',
  'Hot, fresh, Bitcoins - delivered straight to your Lightning node.',
  'You\'ve stacked the sats, now remember to stay humble.',
  'Once you stack, you don\'t go back.',
  'Well done! Keep it up and you\'re going to need a bigger channel.',
  'You\'re a sat stacking machine.',
  'Early to bed and early to buy, makes a man healthy, wealthy, and wise.',
  'I got a sat, you got a sat, everybody\'s got a sat.'
]

export function getSuccessMessage (): string {
  return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]
}

function mapToArr (recurringBuysMap: Map<number, RecurringBuy>): RecurringBuy[] {
  return Array.from(recurringBuysMap.values()).sort((a, b) => {
    return b.id - a.id
  })
}

interface DCAProps {
  recurringBuySubscriber: EventEmitter
}

interface DCAState {
  recurringBuys: RecurringBuy[],
  isDialogOpen: boolean
}

class DCA extends React.Component<DCAProps, DCAState> {
  constructor (props: DCAProps) {
    super(props)
    this.state = {
      recurringBuys: mapToArr(recurringBuys),
      isDialogOpen: false
    }
  }

  onData = (recurringBuys: Map<number, RecurringBuy>): void => {
    this.setState({ recurringBuys: mapToArr(recurringBuys) })
  }

  componentDidMount (): void {
    this.props.recurringBuySubscriber.on('update', this.onData)
  }

  componentWillUnmount (): void {
    this.props.recurringBuySubscriber.removeListener('update', this.onData)
  }

  componentDidUpdate (prevProps: DCAProps): void {
    if (this.props.recurringBuySubscriber !== prevProps.recurringBuySubscriber) {
      prevProps.recurringBuySubscriber.removeListener('update', this.onData)
      this.props.recurringBuySubscriber.on('update', this.onData)
    }
  }

  toggleDialog = (): void => this.setState({ isDialogOpen: !this.state.isDialogOpen })

  maybeRenderEmptyState (): ReactNode {
    if (this.state.recurringBuys.length) {
      return null
    }

    return <Button
      icon='add'
      minimal
      fill
      text='Add Recurring Buy'
      onClick={this.toggleDialog}
    />
  }

  render (): ReactNode {
    const { recurringBuys } = this.state
    return (
      <div className='DCA'>
        <div className="title-row">
          <H4 className='DCATitle'>Recurring</H4>
          <Button
            icon='add'
            onClick={this.toggleDialog}
            minimal
          />
        </div>
        <div className='table-outer'>
          <div className='table-inner'>
            <HTMLTable className='trade-table' condensed={true}>
              <thead>
                <tr>
                  <th className='text-muted'>Size (BTC)</th>
                  <th className='text-muted'>Size (USD)</th>
                  <th className='text-muted'>Schedule</th>
                </tr>
              </thead>
              <tbody>
                {recurringBuys.map(buy => <RecurringBuyRow recurringBuy={buy} key={buy.id} />)}
              </tbody>
            </HTMLTable>
          </div>
        </div>
        {this.maybeRenderEmptyState()}
        <DCADialog isOpen={this.state.isDialogOpen} onClose={this.toggleDialog} />
      </div>
    )
  }
}

export default DCA
