import React, { ReactNode } from 'react'
import {
  Alert,
  Intent,
  IconName,
  Button,
  IButtonProps
} from '@blueprintjs/core'

interface AlertButtonProps {
  buttonText: string,
  buttonProps: IButtonProps,
  confirmButtonText: string,
  intent: Intent,
  icon: IconName,
  cancelButtonText?: string,
  canEscapeKeyCancel?: boolean,
  canOutsideClickCancel?: boolean,
  onCancel?: () => void,
  onConfirm?: () => void,
  onClose?: () => void
}

interface AlertButtonState {
  isOpen: boolean
}

export default class AlertButton extends React.Component<AlertButtonProps, AlertButtonState> {
  constructor (props: AlertButtonProps) {
    super(props)
    this.state = {
      isOpen: false
    }
  }

  handleAlertClose = (_didConfirm: boolean, e?: React.SyntheticEvent): void => {
    this.setState({ isOpen: false })
    if (this.props.onClose) {
      this.props.onClose()
    }
    if (e) {
      e.stopPropagation()
    }
  }

  handleButtonClick = (e: React.MouseEvent): void => {
    this.setState({ isOpen: true })
    e.stopPropagation()
  }

  render (): ReactNode {
    return (
      <React.Fragment>
        <Button
          className={this.props.buttonProps.className}
          intent={this.props.buttonProps.intent}
          icon={this.props.buttonProps.icon}
          small={this.props.buttonProps.small}
          minimal={this.props.buttonProps.minimal}
          onClick={this.handleButtonClick}
        >
          {this.props.buttonText}
        </Button>
        <Alert
          isOpen={this.state.isOpen}
          confirmButtonText={this.props.confirmButtonText}
          intent={this.props.intent}
          icon={this.props.icon}
          cancelButtonText={this.props.cancelButtonText}
          canEscapeKeyCancel={this.props.canEscapeKeyCancel}
          canOutsideClickCancel={this.props.canOutsideClickCancel}
          onCancel={this.props.onCancel}
          onConfirm={this.props.onConfirm}
          onClose={this.handleAlertClose}
        >
          {this.props.children}
        </Alert>
      </React.Fragment>
    )
  }
}
