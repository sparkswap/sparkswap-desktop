import React, { ReactNode } from 'react'
import { Button, Classes, Dialog } from '@blueprintjs/core'
import { FormField } from './form-field'
import { uploadKYC, submitPhoneVerificationCode } from '../../domain/server'
import { showSuccessToast, showErrorToast } from '../AppToaster'
import { ReviewStatus } from '../../../global-shared/types'
import { openBeacon } from '../beacon'
import {
  isValidPhoneNumber,
  isValidSSN,
  isValidBirthdate,
  isValidAddress,
  isValidName
} from '../../../global-shared/validation'

enum KycStage {
  PHONE_INPUT,
  PHONE_VERIFICATION,
  NAME_AND_EMAIL,
  ADDRESS_DOB_AND_SSN
}

interface RegisterDialogProps {
  jurisdiction: string,
  isOpen: boolean,
  onClose: Function,
  onProceed: Function,
  uuid?: string
}

interface RegisterDialogState {
  kycStage: KycStage,
  phoneVerificationCode: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  street: string,
  city: string,
  state: string,
  postalCode: string,
  birthdateMonth: string,
  birthdateDay: string,
  birthdateYear: string,
  ssn: string
}

const initialState = {
  kycStage: KycStage.PHONE_INPUT,
  phoneVerificationCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  birthdateMonth: '',
  birthdateDay: '',
  birthdateYear: '',
  ssn: ''
}

export function parsePhoneNumber (phone: string): string {
  const digits = phone.split('-').join('').split(' ').join('')
  return digits.startsWith('+') ? digits : '+1' + digits
}

export function parseSSN (ssn: string): string {
  const digits = ssn.split('-').join('').split(' ').join('')
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 9)].join('-')
}

function parseBirthdate (year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export class RegisterSparkswapKYC
  extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = Object.assign(initialState, {
      state: props.jurisdiction
    })
  }

  resetState = (): void => {
    this.setState(Object.assign(initialState, {
      state: this.props.jurisdiction
    }))
  }

  onChange = (name: keyof RegisterDialogState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void =>
      this.setState({ ...this.state, [name]: event.target.value })

  onClickContinueNameAndEmail = async (): Promise<void> => {
    const { firstName, lastName, email } = this.state
    const name = { firstName, lastName }
    if (!isValidName(name)) {
      showErrorToast('First name and last name must be present')
      return
    }

    try {
      const { status } = await uploadKYC({
        name,
        email,
        jurisdiction: this.props.jurisdiction
      })

      if (status === ReviewStatus.APPROVED) {
        this.props.onProceed()
        showSuccessToast(`Identity verified`)
      } else if (status === ReviewStatus.INCOMPLETE) {
        this.setState({ kycStage: KycStage.ADDRESS_DOB_AND_SSN })
      } else {
        showErrorToast(`Identity not verified`)
      }
    } catch (e) {
      showErrorToast(`Error during identity verification: ${e.message}`)
    }
  }

  onClickContinuePhoneVerification = async (): Promise<void> => {
    const { phoneVerificationCode: code } = this.state
    const phone = parsePhoneNumber(this.state.phone)
    try {
      const { verified } = await submitPhoneVerificationCode({ phone, code })
      if (!verified) {
        throw new Error('Failed to verify phone')
      }
      this.setState({ kycStage: KycStage.NAME_AND_EMAIL })
    } catch (e) {
      showErrorToast('Unable to verify phone')
      this.props.onClose()
    }
  }

  onClickContinuePhoneInput = async (): Promise<void> => {
    const phone = parsePhoneNumber(this.state.phone)
    if (!isValidPhoneNumber(phone)) {
      showErrorToast('Invalid phone number (only digits and dashes allowed)')
      return
    }
    try {
      const { status } = await uploadKYC({ phone })
      if (status === ReviewStatus.INCOMPLETE) {
        this.setState({ kycStage: KycStage.PHONE_VERIFICATION })
      } else {
        showErrorToast('Something went wrong, please try again.')
        this.props.onClose()
      }
    } catch (e) {
      showErrorToast(`Failed to submit phone number: ${e.message}`)
    }
  }

  onClickContinueAddressBirthdateAndSsn = async (): Promise<void> => {
    try {
      const address = {
        street: this.state.street,
        city: this.state.city,
        state: this.state.state,
        postalCode: this.state.postalCode,
        country: 'US' // Hardcoded until we support other countries
      }

      const { birthdateDay, birthdateMonth, birthdateYear } = this.state
      const birthdate = parseBirthdate(
        birthdateYear, birthdateMonth, birthdateDay)
      const ssn = parseSSN(this.state.ssn)

      const validationErrors = [
        ['address', isValidAddress(address)],
        ['birthdate', isValidBirthdate(birthdate)],
        ['SSN', isValidSSN(ssn)]
      ].filter(([_, isValid]) => !isValid).map(([name, _]) => name)

      if (validationErrors.length > 0) {
        showErrorToast('Invalid ' + validationErrors.join(', '))
        return
      }

      const { status } = await uploadKYC({
        address,
        birthdate,
        ssn
      })
      if (status === ReviewStatus.APPROVED) {
        this.props.onProceed()
      } else {
        showErrorToast('Unable to verify your identity', {
          text: 'Contact Support',
          onClick: openBeacon
        })
        this.resetState()
        this.props.onClose()
      }
    } catch (e) {
      showErrorToast(`Failed to submit data: ${e.message}`)
    }
  }

  renderPhoneVerification (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Verify Your Phone" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <FormField formId="verification-code" label="Verification Code" value={this.state.phoneVerificationCode}
            onChange={this.onChange('phoneVerificationCode')} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Return to app" onClick={onClose} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button text="Continue" onClick={this.onClickContinuePhoneVerification} />
          </div>
        </div>
      </Dialog>
    )
  }

  renderNameAndEmailInput (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Verify Your Identity" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <p>We will try to verify your identity.</p>
          <FormField formId="first-name" label="First Name" value={this.state.firstName}
            onChange={this.onChange('firstName')} />
          <FormField formId="last-name" label="Last Name" value={this.state.lastName}
            onChange={this.onChange('lastName')} />
          <FormField formId="email" label="Email Address" value={this.state.email} onChange={this.onChange('email')} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Return to app" onClick={onClose} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button text="Continue" onClick={this.onClickContinueNameAndEmail} />
          </div>
        </div>
      </Dialog>
    )
  }

  renderPhoneInput (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Phone Number" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <p>Please enter your phone number. We will send a verification code (SMS rates apply).</p>
          <FormField formId="phone" label="Phone Number" value={this.state.phone} onChange={this.onChange('phone')} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Return to app" onClick={onClose} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button text="Continue" onClick={this.onClickContinuePhoneInput} />
          </div>
        </div>
      </Dialog>
    )
  }

  renderAddressBirthdateAndSsn (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Additional Info" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <p>We need additional information to verify your identity.</p>
          <FormField formId="street" label="Street Address" value={this.state.street}
            onChange={this.onChange('street')} />
          <FormField formId="city" label="City" value={this.state.city} onChange={this.onChange('city')} />
          <FormField formId="state" label="State" value={this.state.state} disabled={true} />
          <FormField formId="postal-code" label="Postal Code" value={this.state.postalCode} onChange={this.onChange('postalCode')} />
          <FormField formId="birthdate-month" label="Month" value={this.state.birthdateMonth} onChange={this.onChange('birthdateMonth')} />
          <FormField formId="birthdate-day" label="Day" value={this.state.birthdateDay} onChange={this.onChange('birthdateDay')} />
          <FormField formId="birthdate-year" label="Year" value={this.state.birthdateYear} onChange={this.onChange('birthdateYear')} />
          <FormField formId="ssn" label="Social Security Number" value={this.state.ssn} onChange={this.onChange('ssn')} />
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Return to app" onClick={onClose} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button text="Continue" onClick={this.onClickContinueAddressBirthdateAndSsn} />
          </div>
        </div>
      </Dialog>
    )
  }

  render (): ReactNode {
    switch (this.state.kycStage) {
      case KycStage.PHONE_INPUT:
        return this.renderPhoneInput()
      case KycStage.PHONE_VERIFICATION:
        return this.renderPhoneVerification()
      case KycStage.NAME_AND_EMAIL:
        return this.renderNameAndEmailInput()
      case KycStage.ADDRESS_DOB_AND_SSN:
        return this.renderAddressBirthdateAndSsn()
    }
  }
}
