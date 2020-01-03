import React, { ReactNode } from 'react'
import { FormGroup } from '@blueprintjs/core'
import { ValidatedInput } from '../components'

interface FormFieldProps {
  formId: string,
  label: ReactNode,
  value: string,
  validator?: (value: string) => boolean,
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
        <ValidatedInput
          id={this.props.formId}
          value={this.props.value}
          validator={this.props.validator}
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
