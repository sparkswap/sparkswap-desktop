import React, { ReactNode } from 'react'
import { Alignment, Button, Classes, Dialog, MenuItem } from '@blueprintjs/core'
import { Select, ItemRenderer, ItemPredicate } from '@blueprintjs/select'
import { getLocation, isApprovedLocation } from '../../domain/location'
import { SubscribeForm } from './subscribe-form'
import { REGIONS } from './regions'
import { RegisterAbacus } from './register-abacus'
import { RegisterSparkswapKYC } from './register-sparkswap-kyc'

const RegionSelect = Select.ofType<string>()

const renderRegion: ItemRenderer<string> = (region, { handleClick, modifiers }) => {
  if (!modifiers.matchesPredicate) return null

  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={region}
      onClick={handleClick}
      text={region}
    />
  )
}

const filterRegion: ItemPredicate<string> = (query, region, _index, exactMatch) => {
  const normalizedRegion = region.toLowerCase()
  const normalizedQuery = query.toLowerCase()

  if (exactMatch) {
    return normalizedRegion === normalizedQuery
  } else {
    return region.indexOf(normalizedQuery) >= 0
  }
}

const regionSelectProps = {
  itemPredicate: filterRegion,
  itemRenderer: renderRegion,
  items: REGIONS
}

interface RegisterDialogState {
  hasClickedRegister: boolean,
  loading: boolean,
  region: string,
  isApprovedRegion?: boolean,
  didUserConfirmRegion: boolean
}

interface RegisterDialogProps {
  onProceed: Function,
  isOpen: boolean,
  onClose: Function,
  uuid?: string
}

export class RegisterDialog extends React.Component<RegisterDialogProps, RegisterDialogState> {
  constructor (props: RegisterDialogProps) {
    super(props)
    this.state = {
      hasClickedRegister: false,
      loading: false,
      region: '',
      didUserConfirmRegion: false
    }
  }

  componentDidMount (): void {
    this.updateLocationFromIp()
  }

  updateLocationFromIp = async (): Promise<void> => {
    const locationResponse = await getLocation()
    if (!locationResponse) return

    const { region } = locationResponse
    if (REGIONS.includes(region)) {
      this.setState({ region })
    }
  }

  handleRegionSelection = (region: string): void => {
    this.setState({ region: region })
  }

  handleRegionSubmission = async (): Promise<void> => {
    const { region } = this.state

    const isApprovedRegion = await isApprovedLocation(region)
    this.setState({
      isApprovedRegion,
      didUserConfirmRegion: true
    })
  }

  renderLocationSelection (): ReactNode {
    return (
      <Dialog
        title="Select Location"
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
      >
        <div className={Classes.DIALOG_BODY}>
          <p>Sparkswap is currently only available in select locations. Choose your location of residence before proceeding to Deposit funds.</p>
          <div className='select-region'>
            <RegionSelect
              className="select-region"
              {...regionSelectProps}
              filterable={false}
              onItemSelect={this.handleRegionSelection}
              activeItem={this.state.region || null}
            >
              <span className="state-label">State</span>
              <Button
                className="select-button"
                text={this.state.region || 'Select your region'}
                alignText={Alignment.LEFT}
                rightIcon="caret-down"
              />
            </RegionSelect>
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <Button
            minimal={true}
            text="Return to app"
            onClick={() => this.props.onClose()}
          />
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text="Continue"
              rightIcon='double-chevron-right'
              onClick={this.handleRegionSubmission}
              disabled={!this.state.region}
              className='RegisterButton'
              fill={true}
              loading={this.state.loading}
            />
          </div>
        </div>
      </Dialog>
    )
  }

  renderUnapprovedLocation (): ReactNode {
    const { region } = this.state

    return (
      <SubscribeForm
        onClose={this.props.onClose}
        isOpen={this.props.isOpen}
        region={region}
      />
    )
  }

  renderRegistration (): ReactNode {
    if (process.env.REACT_APP_SPARKSWAP_KYC === 'true') {
      return <RegisterSparkswapKYC onProceed={this.props.onProceed} jurisdiction={this.state.region}
        isOpen={this.props.isOpen} onClose={this.props.onClose} />
    }
    return (
      <RegisterAbacus uuid={this.props.uuid} onProceed={this.props.onProceed} onClose={this.props.onClose} isOpen={this.props.isOpen} />
    )
  }

  maybeRenderRegistration (): ReactNode {
    const { isApprovedRegion } = this.state

    if (isApprovedRegion) return this.renderRegistration()
    return this.renderUnapprovedLocation()
  }

  render (): ReactNode {
    const { didUserConfirmRegion } = this.state
    return !didUserConfirmRegion ? this.renderLocationSelection() : this.maybeRenderRegistration()
  }
}
