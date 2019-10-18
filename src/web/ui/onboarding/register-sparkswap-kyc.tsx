import React, { ReactNode } from 'react'
import { Button, Classes, Dialog, FormGroup, InputGroup } from '@blueprintjs/core'
import { uploadKYC } from '../../domain/server'
import { showSuccessToast, showErrorToast } from '../AppToaster'

interface RegisterDialogProps {
  region: string,
  isOpen: boolean,
  onClose: Function,
  uuid?: string
}

interface RegisterDialogState {
  firstName: string,
  lastName: string,
  email: string,
  phone: string
}

export class RegisterSparkswapKYC
  extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    }
  }

  handleFirstNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ firstName: event.target.value })
  }

  handleLastNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ lastName: event.target.value })
  }

  handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ email: event.target.value })
  }

  handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ phone: event.target.value })
  }

  onClickContinue = async (): Promise<void> => {
    const region = this.props.region
    const { firstName, lastName, email, phone } = this.state
    const { approved } = await uploadKYC({
      firstName,
      lastName,
      email,
      phone,
      region
    })
    this.props.onClose()
    if (approved) {
      showSuccessToast(`Identity verified`)
    } else {
      showErrorToast(`Identity not verified`)
    }
  }

  render (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Verify Your Identity" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup labelFor="first-name" label="First Name">
            <InputGroup
              id="first-name"
              value={this.state.firstName}
              onChange={this.handleFirstNameChange}
            />
          </FormGroup>
          <FormGroup labelFor="last-name" label="Last Name">
            <InputGroup
              id="last-name"
              value={this.state.lastName}
              onChange={this.handleLastNameChange}
            />
          </FormGroup>
          <FormGroup labelFor="email" label="Email Address">
            <InputGroup
              id="email"
              value={this.state.email}
              onChange={this.handleEmailChange}
            />
          </FormGroup>
          <FormGroup labelFor="phone" label="Phone Number">
            <InputGroup
              id="phone"
              value={this.state.phone}
              onChange={this.handlePhoneChange}
            />
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Return to app" onClick={onClose} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button text="Continue" onClick={this.onClickContinue} />
          </div>
        </div>
      </Dialog>
    )
  }
}
