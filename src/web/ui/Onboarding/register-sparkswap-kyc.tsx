import React, { CSSProperties, ReactNode } from 'react'
import {
  ControlGroup,
  InputGroup,
  Button,
  Classes,
  Dialog,
  FormGroup,
  H5,
  Spinner
} from '@blueprintjs/core'
import { FormField } from './form-field'
import { BirthdateForm } from './BirthdateForm'
import { uploadKYC, submitPhoneVerificationCode } from '../../domain/server'
import { showSuccessToast, showErrorToast } from '../AppToaster'
import { Nullable, ReviewStatus } from '../../../global-shared/types'
import { openBeacon } from '../beacon'
import {
  isValidPhoneNumber,
  isValidSSN,
  isValidBirthdate,
  isValidAddress,
  isValidName,
  isValidPostalCode,
  isValidEmail
} from '../../../global-shared/validation'
import { SpinnerSuccess, ValidatedInput } from '../components'
import { Berbix } from './berbix'
import './register-sparkswap-kyc.css'
import { parsePhoneNumber, parseSSN } from '../../../global-shared/parsers'

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
  phoneError: boolean,
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
  isLoading: boolean,
  isKycDone: boolean
}

const initialState = {
  kycStage: KycStage.PHONE,
  phoneVerificationCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  phoneError: false,
  street: '',
  street2: '',
  city: '',
  postalCode: '',
  birthdate: null,
  ssn: '',
  isSendingVerificationCode: false,
  isVerificationCodeSent: false,
  isVerifyingCode: false,
  isLoading: false,
  isKycDone: false
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

  onCompletePhotoId = (): void => {
    try {
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

    if (!isValidEmail(email)) {
      showErrorToast('A valid email address must be present')
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
        this.setState({ isKycDone: true })
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
      if (!verified) {
        throw new Error('Failed to verify phone')
      }
      this.setState({
        kycStage: KycStage.NAME_AND_EMAIL,
        phoneVerificationCode: ''
      })
    } catch (e) {
      showErrorToast('Unable to verify phone')
    } finally {
      this.setState({ isVerifyingCode: false })
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
        this.setState({ isKycDone: true })
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
            <FormField
              autoFocus={true}
              formId="first-name"
              label="First Name"
              value={this.state.firstName}
              onChange={this.onChange('firstName')}
              validator={firstName => firstName.length > 0}
            />
            <FormField
              formId="last-name"
              label="Last Name"
              value={this.state.lastName}
              onChange={this.onChange('lastName')}
              validator={lastName => lastName.length > 0}
            />
            <FormField
              formId="email"
              label="Email Address"
              value={this.state.email}
              onChange={this.onChange('email')}
              validator={email => isValidEmail(email)}
            />
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
              <ValidatedInput
                autoFocus={true}
                id="phone-number"
                value={this.state.phone}
                onChange={this.onChange('phone')}
                validator={(phone) => isValidPhoneNumber(parsePhoneNumber(phone))}
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
            <FormField
              formId="verification-code"
              label="Verification Code"
              value={this.state.phoneVerificationCode}
              onChange={this.onChange('phoneVerificationCode')}
            />
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
                validator={ssn => isValidSSN(parseSSN(ssn))}
                placeholder="123-45-6789"
                size={12}
              />
            </div>
            <div className="form-section">
              <FormGroup labelFor="street" label={<H5>Home Address</H5>}>
                <ValidatedInput
                  id="street"
                  value={this.state.street}
                  onChange={this.onChange('street')}
                  placeholder="123 Main St"
                  validator={street => street.length > 0}
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
                validator={city => city.length > 0}
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
                  validator={isValidPostalCode}
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

  renderKycSuccess (): ReactNode {
    const onClose = (): void => {
      this.setState({ isKycDone: false })
      this.props.onClose()
    }
    const onClick = (): void => {
      this.setState({ isKycDone: false })
      this.props.onProceed()
    }

    return (
      <Dialog title="Identity Verified" isOpen={this.props.isOpen} onClose={onClose}>
        <div className={Classes.DIALOG_BODY}>
          <SpinnerSuccess
            size={Spinner.SIZE_LARGE}
            className='AnchorSpinner'
          />
          <p>You have successfully verified your identity. Click continue to link your bank account and start buying BTC.</p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              type="submit"
              text="Continue"
              rightIcon='double-chevron-right'
              className="RegisterButton"
              fill={true}
              loading={this.state.isLoading}
              onClick={onClick}
            />
          </div>
        </div>
      </Dialog>
    )
  }

  render (): ReactNode {
    const isOpen = this.props.isOpen
    const onClose = (): void => this.props.onClose()
    const onGoBack = (): void => this.onGoBack()
    const onComplete = (): void => this.onCompletePhotoId()

    if (this.state.isKycDone) {
      return this.renderKycSuccess()
    }

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
