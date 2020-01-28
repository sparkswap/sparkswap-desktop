import React, { ReactNode } from 'react'
import { Alignment, Button, Classes, Dialog, MenuItem, Checkbox, PopoverPosition } from '@blueprintjs/core'
import { Select, ItemRenderer, ItemPredicate } from '@blueprintjs/select'
import { getJurisdiction, isApprovedJurisdiction } from '../../domain/jurisdiction'
import { SubscribeForm } from './subscribe-form'
import { JURISDICTIONS } from './jurisdictions'
import { RegisterSparkswapKYC } from './register-sparkswap-kyc'
import { showErrorToast } from '../AppToaster'
import { ExternalLink } from '../components/ExternalSource'

const JurisdictionSelect = Select.ofType<string>()

const renderJurisdiction: ItemRenderer<string> = (jurisdiction, { handleClick, modifiers }) => {
  if (!modifiers.matchesPredicate) return null

  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={jurisdiction}
      onClick={handleClick}
      text={jurisdiction}
    />
  )
}

const filterJurisdiction: ItemPredicate<string> = (query, jurisdiction, _index, exactMatch) => {
  const normalizedJurisdiction = jurisdiction.toLowerCase()
  const normalizedQuery = query.toLowerCase()

  if (exactMatch) {
    return normalizedJurisdiction === normalizedQuery
  } else {
    return jurisdiction.indexOf(normalizedQuery) >= 0
  }
}

const jurisdictionSelectProps = {
  itemPredicate: filterJurisdiction,
  itemRenderer: renderJurisdiction,
  items: JURISDICTIONS
}

interface RegisterDialogState {
  hasClickedRegister: boolean,
  loading: boolean,
  jurisdiction: string,
  isApprovedJurisdiction?: boolean,
  didUserConfirmJurisdiction: boolean,
  agreedTerms: boolean
}

interface RegisterDialogProps {
  onProceed: Function,
  isOpen: boolean,
  onClose: Function,
  onboardingVersion?: number,
  uuid?: string
}

export class RegisterDialog extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = {
      hasClickedRegister: false,
      loading: false,
      jurisdiction: '',
      didUserConfirmJurisdiction: false,
      agreedTerms: false
    }
  }

  componentDidMount (): void {
    this.updateJurisdictionFromIp()
  }

  updateJurisdictionFromIp = async (): Promise<void> => {
    const jurisdictionResponse = await getJurisdiction()
    if (!jurisdictionResponse) return

    const { jurisdiction } = jurisdictionResponse
    if (JURISDICTIONS.includes(jurisdiction)) {
      this.setState({ jurisdiction })
    }
  }

  handleJurisdictionSelection = (jurisdiction: string): void => {
    this.setState({ jurisdiction })
  }

  handleJurisdictionSubmission = (): void => {
    this.setState({
      loading: true
    })
    const {
      jurisdiction,
      agreedTerms
    } = this.state

    if (!agreedTerms) {
      showErrorToast('You must agree to the Terms of Service before proceeding.')
      this.setState({
        loading: false
      })
      return
    }

    try {
      const approvedJurisdiction = isApprovedJurisdiction(jurisdiction)
      this.setState({
        isApprovedJurisdiction: approvedJurisdiction,
        didUserConfirmJurisdiction: true
      })
    } catch (e) {
      showErrorToast(`Error: ${e.message}`)
    } finally {
      this.setState({
        loading: false
      })
    }
  }

  renderJurisdictionSelection (): ReactNode {
    return (
      <Dialog
        title='Select Location'
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
      >
        <form action='#' onSubmit={this.handleJurisdictionSubmission}>
          <div className={Classes.DIALOG_BODY}>
            <p>Sparkswap is currently only available in select locations. Choose your location of residence before proceeding to Deposit funds.</p>
            <div className='select-jurisdiction'>
              <JurisdictionSelect
                className='select-jurisdiction'
                {...jurisdictionSelectProps}
                filterable={false}
                onItemSelect={this.handleJurisdictionSelection}
                activeItem={this.state.jurisdiction || null}
                popoverProps={{
                  position: PopoverPosition.TOP,
                  minimal: true
                }}
              >
                <span className='state-label'>State</span>
                <Button
                  className='select-button'
                  text={this.state.jurisdiction || 'Select your location'}
                  alignText={Alignment.LEFT}
                  rightIcon='caret-down'
                />
              </JurisdictionSelect>
            </div>
            <Checkbox
              checked={this.state.agreedTerms}
              onChange={() => this.setState({ agreedTerms: !this.state.agreedTerms })}
            >
              I agree to Sparkswap&apos;s&nbsp;
              <ExternalLink href='https://sparkswap.com/terms'>Terms of Service</ExternalLink>
            </Checkbox>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <Button
              minimal={true}
              text='Return to app'
              onClick={() => this.props.onClose()}
            />
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                autoFocus={true}
                text='Continue'
                rightIcon='double-chevron-right'
                onClick={this.handleJurisdictionSubmission}
                disabled={!this.state.jurisdiction}
                className='RegisterButton'
                fill={true}
                loading={this.state.loading}
              />
            </div>
          </div>
        </form>
      </Dialog>
    )
  }

  renderUnapprovedJurisdiction (): ReactNode {
    const { jurisdiction } = this.state

    return (
      <SubscribeForm
        onClose={this.props.onClose}
        isOpen={this.props.isOpen}
        jurisdiction={jurisdiction}
      />
    )
  }

  reselectJurisdiction = (): void => {
    this.setState({ didUserConfirmJurisdiction: false })
  }

  renderRegistration (): ReactNode {
    return (
      <RegisterSparkswapKYC
        onProceed={this.props.onProceed}
        jurisdiction={this.state.jurisdiction}
        agreedTerms={this.state.agreedTerms}
        isOpen={this.props.isOpen}
        onClose={this.props.onClose}
        reselectJurisdiction={this.reselectJurisdiction}
      />
    )
  }

  maybeRenderRegistration (): ReactNode {
    const { isApprovedJurisdiction } = this.state

    if (isApprovedJurisdiction) return this.renderRegistration()
    return this.renderUnapprovedJurisdiction()
  }

  render (): ReactNode {
    const { didUserConfirmJurisdiction } = this.state
    return !didUserConfirmJurisdiction ? this.renderJurisdictionSelection() : this.maybeRenderRegistration()
  }
}
