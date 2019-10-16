import React, { ReactNode } from 'react'
import { Button, Classes, Dialog, H5 } from '@blueprintjs/core'
import { ExternalButton, ExternalLink } from '../components'
import { IS_PRODUCTION } from '../../../common/config'
import { openBeacon } from '../beacon'

// We assume development will always refer to `register-sandbox`
const BASE_URL = IS_PRODUCTION
  ? 'https://sparkswap.com/register/'
  : 'https://sparkswap.com/register-sandbox/'

export function getRegistrationURL (uuid: string): string {
  return `${BASE_URL}${uuid}`
}

interface RegisterDialogState {
  hasClickedRegister: boolean,
  loading: boolean
}

interface RegisterDialogProps {
  onProceed: Function,
  isOpen: boolean,
  onClose: Function,
  uuid?: string
}

export class RegisterAbacus extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = {
      hasClickedRegister: false,
      loading: false
    }
  }

  get registrationUrl (): string {
    return getRegistrationURL(this.props.uuid || '')
  }

  handleRegister = (): void => {
    this.setState({ hasClickedRegister: true })
  }

  handleDone = async (): Promise<void> => {
    this.setState({ loading: true })
    await this.props.onProceed()
    this.setState({ loading: false })
  }

  renderButton (): ReactNode {
    if (this.state.hasClickedRegister) {
      return (
        <Button
          text="Next Step"
          rightIcon='double-chevron-right'
          onClick={this.handleDone}
          className='RegisterButton'
          fill={true}
          loading={this.state.loading}
        />
      )
    }

    return (
      <ExternalButton
        href={this.registrationUrl}
        onClick={this.handleRegister}
        rightIcon='share'
        text='Verify ID with Abacus'
        className='RegisterButton'
        fill={true}
        loading={this.state.loading}
      />
    )
  }

  renderBody (): ReactNode {
    const textBeforeClickingRegister = (
      <React.Fragment>
        <p>In order to trade on Sparkswap, you need to complete the identity verification process through our partner Abacus.</p>
        <p>If you have any questions or concerns about this process, please <Button className="link-button" minimal={true} onClick={openBeacon}>contact us</Button>.</p>
        <p>Upon clicking <ExternalLink href={this.registrationUrl}>Verify ID</ExternalLink>, you will be taken to a webpage to submit your identity information.</p>
      </React.Fragment>
    )

    const textAfterClickingRegister = (
      <React.Fragment>
        <p>If you have submitted your information, click the button below to proceed to <b>Step 2</b> and deposit USD into Sparkswap.</p>
        <p>Click <ExternalLink href={this.registrationUrl}>here</ExternalLink> if you still need to verify your identity with Abacus.</p>
      </React.Fragment>
    )
    return this.state.hasClickedRegister
      ? textAfterClickingRegister
      : textBeforeClickingRegister
  }

  render (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Deposit USD" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <H5>Step 1 of 2 <span className='subtitle'>Verify Your Identity</span></H5>
          {this.renderBody()}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Return to app" onClick={onClose} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            {this.renderButton()}
          </div>
        </div>
      </Dialog>
    )
  }
}
