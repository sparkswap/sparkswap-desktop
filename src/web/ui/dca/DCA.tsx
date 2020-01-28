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
  executingBuys: Set<number>,
  recurringBuys: RecurringBuy[],
  isDialogOpen: boolean
}

class DCA extends React.Component<DCAProps, DCAState> {
  constructor (props: DCAProps) {
    super(props)
    this.state = {
      recurringBuys: mapToArr(recurringBuys),
      executingBuys: new Set(),
      isDialogOpen: false
    }
  }

  onData = (recurringBuys: Map<number, RecurringBuy>): void => {
    this.setState({ recurringBuys: mapToArr(recurringBuys) })
  }

  onExecuting = (id: number): void => {
    this.state.executingBuys.add(id)
    this.setState({
      executingBuys: this.state.executingBuys
    })
  }

  onDone = (id: number): void => {
    this.state.executingBuys.delete(id)
    this.setState({
      executingBuys: this.state.executingBuys
    })
  }

  componentDidMount (): void {
    this.props.recurringBuySubscriber.on('update', this.onData)
    this.props.recurringBuySubscriber.on('executing:id', this.onExecuting)
    this.props.recurringBuySubscriber.on('success:id', this.onDone)
    this.props.recurringBuySubscriber.on('error:id', this.onDone)
  }

  componentWillUnmount (): void {
    this.props.recurringBuySubscriber.removeListener('update', this.onData)
    this.props.recurringBuySubscriber.removeListener('executing:id', this.onExecuting)
    this.props.recurringBuySubscriber.removeListener('success:id', this.onDone)
    this.props.recurringBuySubscriber.removeListener('error:id', this.onDone)
  }

  componentDidUpdate (prevProps: DCAProps): void {
    if (this.props.recurringBuySubscriber !== prevProps.recurringBuySubscriber) {
      prevProps.recurringBuySubscriber.removeListener('update', this.onData)
      prevProps.recurringBuySubscriber.removeListener('executing:id', this.onExecuting)
      prevProps.recurringBuySubscriber.removeListener('success:id', this.onDone)
      prevProps.recurringBuySubscriber.removeListener('error:id', this.onDone)
      this.props.recurringBuySubscriber.on('update', this.onData)
      this.props.recurringBuySubscriber.on('executing:id', this.onExecuting)
      this.props.recurringBuySubscriber.on('success:id', this.onDone)
      this.props.recurringBuySubscriber.on('error:id', this.onDone)
    }
  }

  toggleDialog = (): void => this.setState({ isDialogOpen: !this.state.isDialogOpen })

  renderTable (): ReactNode {
    const {
      recurringBuys,
      executingBuys
    } = this.state

    if (!recurringBuys.length) {
      return <Button
        icon='add'
        minimal
        fill
        text='Add Recurring Buy'
        onClick={this.toggleDialog}
      />
    }

    return (
      <div className='table-outer'>
        <div className='table-inner'>
          <HTMLTable className='trade-table' condensed={true}>
            <tbody>
              {recurringBuys.map(buy => {
                return <RecurringBuyRow
                  recurringBuy={buy}
                  key={buy.id}
                  isExecuting={executingBuys.has(buy.id)}
                />
              })}
            </tbody>
          </HTMLTable>
        </div>
      </div>
    )
  }

  render (): ReactNode {
    return (
      <div className='DCA'>
        <div className='title-row'>
          <H4 className='DCATitle'>Recurring</H4>
          <Button
            icon='add'
            onClick={this.toggleDialog}
            minimal
          />
        </div>
        {this.renderTable()}
        <DCADialog isOpen={this.state.isDialogOpen} onClose={this.toggleDialog} />
      </div>
    )
  }
}

export default DCA
