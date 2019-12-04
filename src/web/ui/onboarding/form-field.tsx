import React, { ReactNode } from 'react'
import { FormGroup, InputGroup } from '@blueprintjs/core'

interface FormFieldProps {
  formId: string,
  label: ReactNode,
  value: string,
  onChange?: React.FormEventHandler<HTMLElement>,
  disabled?: boolean,
  autoFocus?: boolean,
  size?: number,
  placeholder?: string
}

export class FormField extends React.Component<FormFieldProps> {
  render (): ReactNode {
    return (
      <FormGroup className={this.props.formId} labelFor={this.props.formId} label={this.props.label}>
        <InputGroup
          id={this.props.formId}
          key={this.props.formId}
          value={this.props.value}
          onChange={this.props.onChange}
          disabled={this.props.disabled}
          autoFocus={this.props.autoFocus}
          size={this.props.size}
          placeholder={this.props.placeholder}
        />
      </FormGroup>
    )
  }
}
