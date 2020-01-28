import React, { ReactNode } from 'react'
import { FormGroup, NumericInput, Intent } from '@blueprintjs/core'
import { Nullable } from '../../../global-shared/types'
import {
  isValidBirthdate
} from '../../../global-shared/validation'
import './BirthdateForm.css'

const MIN_DAY = 1
const MAX_DAY = 31
const MIN_MONTH = 1
const MAX_MONTH = 12
const MIN_YEAR = 1850
const MAX_YEAR = new Date().getFullYear()

function serializeBirthdate (year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function deserializeBirthdate (birthdate: string): { year: string, month: string, day: string} {
  const [yearStr, monthStr, dayStr] = birthdate.split('-')
  return {
    year: parseInt(yearStr, 10).toString(),
    month: parseInt(monthStr, 10).toString(),
    day: parseInt(dayStr, 10).toString()
  }
}

interface BirthdateFormProps {
  birthdate: Nullable<string>,
  onChange: Function,
  autoFocus?: boolean
}

interface BirthdateFormState {
  month: string,
  day: string,
  year: string
}

function validatePart (part: string | number, min: number, max: number): boolean {
  const val = parseInt(part.toString(), 10)
  return !isNaN(val) && val <= max && val >= min
}

function validateYear (year: string | number): boolean {
  return validatePart(year, MIN_YEAR, MAX_YEAR)
}

function validateMonth (month: string | number): boolean {
  return validatePart(month, MIN_MONTH, MAX_MONTH)
}

function validateDay (day: string | number): boolean {
  return validatePart(day, MIN_DAY, MAX_DAY)
}

function getStateFromProps (props: BirthdateFormProps): BirthdateFormState {
  if (props.birthdate === null) {
    return {
      month: '',
      day: '',
      year: ''
    }
  }
  const { year, month, day } = deserializeBirthdate(props.birthdate)
  return {
    year,
    month,
    day
  }
}

export class BirthdateForm extends React.Component<BirthdateFormProps, BirthdateFormState> {
  constructor (props: BirthdateFormProps) {
    super(props)
    this.state = getStateFromProps(this.props)
  }

  componentDidUpdate (prevProps: BirthdateFormProps): void {
    if (prevProps.birthdate !== this.props.birthdate && this.props.birthdate !== null) {
      this.setState(getStateFromProps(this.props))
    }

    const serialized = serializeBirthdate(this.state.year, this.state.month, this.state.day)
    const newBirthdate = isValidBirthdate(serialized) ? serialized : null

    if (newBirthdate !== this.props.birthdate) {
      this.props.onChange(newBirthdate)
    }
  }

  render (): ReactNode {
    return (
      <div className='birthdate-form'>
        <FormGroup labelFor='birthdate-month' label='Month' className='birthdate-month'>
          <NumericInput
            onValueChange={(_, stringVal: string) => {
              this.setState({
                month: stringVal
              })
            }}
            value={this.state.month}
            intent={this.state.month === '' || validateMonth(this.state.month) ? Intent.NONE : Intent.DANGER}
            buttonPosition='none'
            max={MAX_MONTH}
            min={MIN_MONTH}
            minorStepSize={null}
            majorStepSize={null}
            size={4}
            placeholder='1'
            autoFocus={this.props.autoFocus}
          />
        </FormGroup>
        <FormGroup labelFor='birthdate-day' label='Day' className='birthdate-day'>
          <NumericInput
            onValueChange={(_, stringVal: string) => {
              this.setState({
                day: stringVal
              })
            }}
            value={this.state.day}
            intent={this.state.day === '' || validateDay(this.state.day) ? Intent.NONE : Intent.DANGER}
            buttonPosition='none'
            max={MAX_DAY}
            min={MIN_DAY}
            minorStepSize={null}
            majorStepSize={null}
            size={4}
            placeholder='3'
          />
        </FormGroup>
        <FormGroup labelFor='birthdate-year' label='Year' className='birthdate-year'>
          <NumericInput
            onValueChange={(_, stringVal: string) => {
              this.setState({
                year: stringVal
              })
            }}
            value={this.state.year}
            intent={this.state.year.length < 4 || validateYear(this.state.year) ? Intent.NONE : Intent.DANGER}
            buttonPosition='none'
            max={MAX_YEAR}
            min={MIN_YEAR}
            minorStepSize={null}
            majorStepSize={10}
            size={8}
            placeholder='2009'
          />
        </FormGroup>
      </div>
    )
  }
}
