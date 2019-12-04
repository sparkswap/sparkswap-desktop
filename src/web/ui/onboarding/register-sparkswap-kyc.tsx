import React, { CSSProperties, ReactNode } from 'react'
import { ControlGroup, InputGroup, Button, Classes, Dialog, FormGroup, H5 } from '@blueprintjs/core'
import { FormField } from './form-field'
import { BirthdateForm } from './BirthdateForm'
import { uploadKYC, submitPhoneVerificationCode, finishBerbix } from '../../domain/server'
import { showSuccessToast, showErrorToast } from '../AppToaster'
import { Nullable, ReviewStatus } from '../../../global-shared/types'
import { openBeacon } from '../beacon'
import {
  isValidPhoneNumber,
  isValidSSN,
  isValidBirthdate,
  isValidAddress,
  isValidName
} from '../../../global-shared/validation'
import { Berbix } from './berbix'
import './register-sparkswap-kyc.css'

enum KycStage {
  JURISDICTION,
  PHONE,
  NAME_AND_EMAIL,
  ADDRESS_DOB_AND_SSN,
  BERBIX
}

interface RegisterDialogProps {
  jurisdiction: string,
  agreedTerms: boolean,
  isOpen: boolean,
  onClose: Function,
  onProceed: Function,
  uuid?: string,
  reselectJurisdiction: Function
}

interface RegisterDialogState {
  kycStage: KycStage,
  phoneVerificationCode: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  street: string,
  street2: string,
  city: string,
  state: string,
  postalCode: string,
  birthdate: Nullable<string>,
  ssn: string,
  isSendingVerificationCode: boolean,
  isVerificationCodeSent: boolean,
  isVerifyingCode: boolean,
  isLoading: boolean
}

const initialState = {
  kycStage: KycStage.PHONE,
  phoneVerificationCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  street2: '',
  city: '',
  postalCode: '',
  birthdate: null,
  ssn: '',
  isSendingVerificationCode: false,
  isVerificationCodeSent: false,
  isVerifyingCode: false,
  isLoading: false
}

export function parsePhoneNumber (phone: string): string {
  const digits = phone.split('-').join('').split(' ').join('')
  return digits.startsWith('+') ? digits : '+1' + digits
}

export function parseSSN (ssn: string): string {
  const digits = ssn.split('-').join('').split(' ').join('')
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 9)].join('-')
}

function getPreviousStage (stage: KycStage): Nullable<KycStage> {
  switch (stage) {
    case KycStage.JURISDICTION:
      return null
    case KycStage.PHONE:
      return KycStage.JURISDICTION
    case KycStage.NAME_AND_EMAIL:
      return KycStage.PHONE
    case KycStage.ADDRESS_DOB_AND_SSN:
      return KycStage.NAME_AND_EMAIL
    case KycStage.BERBIX:
      return KycStage.ADDRESS_DOB_AND_SSN
  }
}

function focus (query: string): void {
  const input: HTMLElement | null = document.querySelector(query)
  if (input) {
    input.focus()
  }
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

  onGoBack = (): void => {
    const previousStage = getPreviousStage(this.state.kycStage)
    if (previousStage !== null) {
      this.setState({ kycStage: previousStage })
    }
  }

  onChange = (name: keyof RegisterDialogState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void =>
      this.setState({ ...this.state, [name]: event.target.value })

  onCompleteBerbix = async (): Promise<void> => {
    try {
      // TODO: add response type on server to make sure we were able to
      //  fetch the user's data from Berbix
      await finishBerbix()
      showSuccessToast('Your application is pending review', {
        text: 'Get an update',
        onClick: openBeacon
      })
      return this.props.onClose()
    } catch (e) {
      showErrorToast(`Error during identity verification: ${e.message}`)
    }
  }

  onClickContinueNameAndEmail = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    const { firstName, lastName, email } = this.state
    const name = { firstName, lastName }
    if (!isValidName(name)) {
      showErrorToast('First name and last name must be present')
      return
    }

    try {
      this.setState({ isLoading: true })
      const { status } = await uploadKYC({
        name,
        email,
        jurisdiction: this.props.jurisdiction,
        agreedTerms: this.props.agreedTerms
      })
      this.setState({ isLoading: false })

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

  onClickPhoneVerification = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    const { phoneVerificationCode: code } = this.state
    const phone = parsePhoneNumber(this.state.phone)
    try {
      this.setState({ isVerifyingCode: true })
      const { verified } = await submitPhoneVerificationCode({ phone, code })
      this.setState({ isVerifyingCode: false })
      if (!verified) {
        throw new Error('Failed to verify phone')
      }
      this.setState({
        kycStage: KycStage.NAME_AND_EMAIL,
        phoneVerificationCode: ''
      })
    } catch (e) {
      showErrorToast('Unable to verify phone')
    }
  }

  onClickSendCode = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    const phone = parsePhoneNumber(this.state.phone)
    if (!isValidPhoneNumber(phone)) {
      showErrorToast('Invalid phone number (only digits and dashes allowed)')
      return
    }
    try {
      this.setState({ isSendingVerificationCode: true })
      await uploadKYC({ phone })
      this.setState({ isVerificationCodeSent: true, isSendingVerificationCode: false })
      focus('#verification-code')
    } catch (e) {
      showErrorToast(`Failed to submit phone number: ${e.message}`)
    }
  }

  onClickContinueAddressBirthdateAndSsn = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    try {
      const address = {
        street: this.state.street + (this.state.street2 ? '\n' + this.state.street2 : ''),
        city: this.state.city,
        state: this.state.state,
        postalCode: this.state.postalCode,
        country: 'US' // Hardcoded until we support other countries
      }

      const birthdate = this.state.birthdate
      const ssn = parseSSN(this.state.ssn)

      const validationErrors = [
        ['address', isValidAddress(address)],
        ['birthdate', birthdate === null ? false : isValidBirthdate(birthdate)],
        ['SSN', isValidSSN(ssn)]
      ].filter(([_, isValid]) => !isValid).map(([name, _]) => name)

      if (validationErrors.length > 0) {
        showErrorToast('Invalid ' + validationErrors.join(', '))
        return
      }

      // make the linter happy
      if (birthdate === null) {
        showErrorToast('Invalid birthdate')
        return
      }

      this.setState({ isLoading: true })
      const { status } = await uploadKYC({
        address,
        birthdate,
        ssn
      })
      this.setState({ isLoading: false })

      if (status === ReviewStatus.APPROVED) {
        this.props.onProceed()
      } else if (status === ReviewStatus.INCOMPLETE) {
        this.setState({ kycStage: KycStage.BERBIX })
      } else if (status === ReviewStatus.PENDING) {
        showSuccessToast('Your application is pending review', {
          text: 'Get an update',
          onClick: openBeacon
        })
        this.props.onClose()
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

  renderNameAndEmailInput (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Verify Your Identity" isOpen={this.props.isOpen} onClose={onClose}>
        <form action="#" onSubmit={this.onClickContinueNameAndEmail}>
          <div className={Classes.DIALOG_BODY}>
            <p>The information below is required for us to verify your identity.</p>
            <FormField autoFocus={true} formId="first-name" label="First Name" value={this.state.firstName}
              onChange={this.onChange('firstName')} />
            <FormField formId="last-name" label="Last Name" value={this.state.lastName}
              onChange={this.onChange('lastName')} />
            <FormField formId="email" label="Email Address" value={this.state.email} onChange={this.onChange('email')} />
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <Button minimal={true} text="Go back" onClick={this.onGoBack} />
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                type="submit"
                text="Continue"
                rightIcon='double-chevron-right'
                className="RegisterButton"
                fill={true}
                loading={this.state.isLoading}
              />
            </div>
          </div>
        </form>
      </Dialog>
    )
  }

  renderPhone (): ReactNode {
    const onClose = (): void => this.props.onClose()
    const supportTextStyle: CSSProperties | undefined =
      this.state.isVerificationCodeSent ? undefined : { visibility: 'hidden' }

    return (
      <Dialog title="Phone Verification" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <p>Please enter your phone number. We will send a verification code (SMS rates apply).</p>
          <p>Phone Number</p>
          <form action="#" onSubmit={this.onClickSendCode}>
            <ControlGroup fill={true}>
              <InputGroup
                autoFocus={true}
                id="phone-number"
                value={this.state.phone}
                onChange={this.onChange('phone')}
              />
              <Button
                type="submit"
                text="Send code"
                loading={this.state.isSendingVerificationCode}
              />
            </ControlGroup>
          </form>
          <p style={supportTextStyle}><span style={{ color: 'green' }}>✓</span> Verification code sent</p>
          <br/>
          <form action="#" onSubmit={this.onClickPhoneVerification}>
            <FormField formId="verification-code" label="Verification Code" value={this.state.phoneVerificationCode}
              onChange={this.onChange('phoneVerificationCode')} />
          </form>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button minimal={true} text="Go back" onClick={this.onGoBack} />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text="Continue"
              rightIcon='double-chevron-right'
              onClick={this.onClickPhoneVerification}
              className='RegisterButton'
              fill={true}
              loading={this.state.isVerifyingCode}
            />
          </div>
        </div>
      </Dialog>
    )
  }

  renderAddressBirthdateAndSsn (): ReactNode {
    const onClose = (): void => this.props.onClose()

    return (
      <Dialog title="Additional Info Required" isOpen={this.props.isOpen} onClose={onClose}>
        <form action="#" onSubmit={this.onClickContinueAddressBirthdateAndSsn} className="address-birthdate-ssn-form">
          <div className={Classes.DIALOG_BODY}>
            <div className="form-section">
              <H5>Date of Birth</H5>
              <BirthdateForm
                birthdate={this.state.birthdate}
                onChange={(birthdate: string) => this.setState({ birthdate })}
                autoFocus={true}
              />
            </div>
            <div className="form-section">
              <FormField
                formId="ssn"
                label={<H5>Social Security Number</H5>}
                value={this.state.ssn}
                onChange={this.onChange('ssn')}
                placeholder="123-45-6789"
                size={12}
              />
            </div>
            <div className="form-section">
              <FormGroup labelFor="street" label={<H5>Home Address</H5>}>
                <InputGroup
                  id="street"
                  value={this.state.street}
                  onChange={this.onChange('street')}
                  placeholder="123 Main St"
                />
                <InputGroup
                  className="street2"
                  value={this.state.street2}
                  onChange={this.onChange('street2')}
                  placeholder="Apt 2F (Optional)"
                />
              </FormGroup>
              <FormField
                formId="city"
                label="City"
                value={this.state.city}
                onChange={this.onChange('city')}
                placeholder="San Francisco"
              />
              <div className="state-postal-code">
                <FormField
                  formId="state"
                  label="State"
                  value={this.state.state}
                  disabled={true}
                />
                <FormField
                  formId="postal-code"
                  label="Postal
                  Code"
                  value={this.state.postalCode}
                  size={12}
                  onChange={this.onChange('postalCode')}
                  placeholder="94111"
                />
              </div>
            </div>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <Button minimal={true} text="Go back" onClick={this.onGoBack} />
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                type="submit"
                text="Continue"
                rightIcon='double-chevron-right'
                className="RegisterButton"
                fill={true}
                loading={this.state.isLoading}
              />
            </div>
          </div>
        </form>
      </Dialog>
    )
  }

  render (): ReactNode {
    const isOpen = this.props.isOpen
    const onClose = (): void => this.props.onClose()
    const onGoBack = (): void => this.onGoBack()
    const onComplete = (): Promise<void> => this.onCompleteBerbix()

    switch (this.state.kycStage) {
      case KycStage.JURISDICTION:
        this.props.reselectJurisdiction()
        return null
      case KycStage.PHONE:
        return this.renderPhone()
      case KycStage.NAME_AND_EMAIL:
        return this.renderNameAndEmailInput()
      case KycStage.ADDRESS_DOB_AND_SSN:
        return this.renderAddressBirthdateAndSsn()
      case KycStage.BERBIX:
        return <Berbix
          isOpen={isOpen}
          onGoBack={onGoBack}
          onClose={onClose}
          onComplete={onComplete}
        />
    }
  }
}
