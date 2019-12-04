import React, { ReactNode } from 'react'
import { Dialog, Classes, Spinner, Button } from '@blueprintjs/core'
import { startBerbix } from '../../domain/server'
import { showSupportToast, showSuccessToast } from '../AppToaster'
import './berbix.css'

interface BerbixProps {
  isOpen: boolean,
  onClose: Function,
  onGoBack: Function,
  onComplete: Function
}

interface BerbixState {
  loading: boolean,
  completeLoading: boolean
}

export class Berbix extends React.Component<BerbixProps, BerbixState> {
  constructor (props: BerbixProps) {
    super(props)

    this.state = {
      loading: false,
      completeLoading: false
    }
  }

  async sendBerbixMessage (): Promise<void> {
    try {
      this.setState({
        loading: true
      })
      await startBerbix()
      showSuccessToast('Sent ID Upload link via SMS')
    } catch (e) {
      showSupportToast('Error while collecting additional identity information')
    } finally {
      this.setState({
        loading: false
      })
    }
  }

  handleComplete = async (): Promise<void> => {
    this.setState({ completeLoading: true })
    await this.props.onComplete()
    this.setState({ completeLoading: false })
  }

  componentDidMount (): void {
    this.sendBerbixMessage()
  }

  renderDialogBody (): ReactNode {
    if (this.state.loading) {
      return <Spinner className="BerbixSpinner" size={Spinner.SIZE_LARGE} />
    }
    return (
      <React.Fragment>
        <p>
          You have just been sent a text message at the phone number we have on file.
          Click the link in the message to upload your Photo ID from your phone.
        </p>
        <p>
          If you didn&apos;t receive the text message, <a href="#send-message" onClick={() => this.sendBerbixMessage()}>click here</a> to send it again.
        </p>
      </React.Fragment>
    )
  }

  render (): ReactNode {
    const isOpen = this.props.isOpen
    const onClose = (): void => this.props.onClose()
    const onGoBack = (): void => this.props.onClose()

    return (
      <Dialog title="Upload Photo ID" isOpen={isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          {this.renderDialogBody()}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Go back" onClick={onGoBack} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text="Continue"
              rightIcon='double-chevron-right'
              onClick={this.handleComplete}
              fill={true}
              loading={this.state.completeLoading}
            />
          </div>
        </div>
      </Dialog>
    )
  }
}
