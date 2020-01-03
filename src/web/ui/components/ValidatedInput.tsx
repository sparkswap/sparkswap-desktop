import React, { ReactNode } from 'react'
import { InputGroup, Intent } from '@blueprintjs/core'

interface ValidatedInputProps {
  value: string,
  onChange?: React.FormEventHandler<HTMLElement>,
  id?: string,
  validator?: (value: string) => boolean,
  disabled?: boolean,
  autoFocus?: boolean,
  size?: number,
  placeholder?: string
}

interface ValidatedInputState {
  error: boolean
}

class ValidatedInput extends React.Component<ValidatedInputProps, ValidatedInputState> {
  constructor (props: ValidatedInputProps) {
    super(props)
    this.state = {
      error: false
    }
  }

  validateField = (value?: string): void => {
    if (this.props.validator) {
      const val = value === undefined ? this.props.value : value
      this.setState({ error: !this.props.validator(val) })
    }
  }

  handleChange = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    if (this.state.error) {
      this.validateField(evt.target.value)
    }
    if (this.props.onChange) {
      this.props.onChange(evt)
    }
  }

  handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      this.validateField()
    }
  }

  render (): ReactNode {
    return (
      <InputGroup
        id={this.props.id}
        key={this.props.id}
        value={this.props.value}
        onChange={this.handleChange}
        onBlur={() => this.validateField()}
        onKeyPress={this.handleKeyPress}
        intent={this.state.error ? Intent.DANGER : Intent.NONE}
        disabled={this.props.disabled}
        autoFocus={this.props.autoFocus}
        size={this.props.size}
        placeholder={this.props.placeholder}
      />
    )
  }
}

export default ValidatedInput
