import { marketDataSubscriber } from '../domain/market-data'
import { exportTrades } from '../domain/history'
import React, { ReactNode } from 'react'
import { FormGroup, Button, Classes, Dialog, } from '@blueprintjs/core'
import { FilePathInput } from './components'

const EXPORT_TRADE_LIMIT = 3000

interface DCADialogProps {
  isOpen: boolean,
  onClose: Function
}

interface HistoryExportDialogState {
  historyExportPath: string,
}

const initialState: HistoryExportDialogState = {
  historyExportPath: '',
}

export class HistoryExportDialog extends React.Component<DCADialogProps, HistoryExportDialogState> {
  constructor (props: DCADialogProps) {
    super(props)
    this.state = initialState
  }

  resetState = (): void => {
    this.setState(Object.assign(initialState, {
      currentPrice: marketDataSubscriber.currentPrice
    }))
  }

  handleHistoryExportPathChange = (historyExportPath: string): void => {
    this.setState({
      historyExportPath
    })
  }

  onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    exportTrades(EXPORT_TRADE_LIMIT, this.state.historyExportPath)
    this.props.onClose()
  }

  onChange = (name: keyof HistoryExportDialogState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void =>
      this.setState({ ...this.state, [name]: event.target.value })

  render (): ReactNode {
    const { isOpen } = this.props
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title='Export Trade History' isOpen={isOpen} onClose={onClose}>
        <form action='#' onSubmit={this.onSubmit}>
          <div className={Classes.DIALOG_BODY}>
            <FormGroup
              labelFor="history-export-path"
              label="History export path"
            >
              <FilePathInput
                id="history-export-path"
                placeholder="/path/to/history.csv"
                value={this.state.historyExportPath}
                onChange={this.handleHistoryExportPathChange}
              />
            </FormGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              type='submit'
              icon='export'
              text='Export'
              fill={true}
            />
            </div>
          </div>
        </form>
      </Dialog>
    )
  }
}
