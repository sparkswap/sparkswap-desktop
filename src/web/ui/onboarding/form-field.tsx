import React, { ReactNode } from 'react'
import { FormGroup, InputGroup } from '@blueprintjs/core'

interface FormFieldProps {
  formId: string,
  label: string,
  value: string,
  onChange?: React.FormEventHandler<HTMLElement>,
  disabled?: boolean
}

export class FormField extends React.Component<FormFieldProps> {
  render (): ReactNode {
    return (
      <FormGroup labelFor={this.props.formId} label={this.props.label}>
        <InputGroup
          id={this.props.formId}
          value={this.props.value}
          onChange={this.props.onChange}
          disabled={this.props.disabled}
        />
      </FormGroup>
    )
  }
}
