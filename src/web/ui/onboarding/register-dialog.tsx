import React, { ReactNode } from 'react'
import { Alignment, Button, Classes, Dialog, MenuItem } from '@blueprintjs/core'
import { Select, ItemRenderer, ItemPredicate } from '@blueprintjs/select'
import { getLocation, isApprovedLocation } from '../../domain/location'
import { showErrorToast } from '../AppToaster'
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
  userRegionFromIp?: string,
  userRegionFromSelection: string,
  isApprovedRegion?: boolean,
  userConfirmedRegion: boolean
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
      userRegionFromSelection: '',
      userConfirmedRegion: false
    }
  }

  componentDidMount (): void {
    this.updateLocationFromIp()
  }

  updateLocationFromIp = async (): Promise<void> => {
    const locationResponse = await getLocation()
    if (!locationResponse) return

    const { region } = locationResponse
    this.setState({
      userRegionFromIp: region
    })
  }

  handleRegionSelection = (region: string): void => {
    this.setState({ userRegionFromSelection: region })
  }

  handleRegionSubmission = async (): Promise<void> => {
    const { userRegionFromSelection, userRegionFromIp } = this.state
    const regionToVerify = userRegionFromSelection || userRegionFromIp

    if (!regionToVerify) {
      showErrorToast('You must select your region to continue')
      return
    }

    const isApprovedRegion = await isApprovedLocation(regionToVerify)
    this.setState({
      isApprovedRegion,
      userConfirmedRegion: true
    })
  }

  getLocationText (): string | null {
    const { userRegionFromSelection, userRegionFromIp } = this.state

    if (userRegionFromSelection) return userRegionFromSelection
    if (userRegionFromIp && REGIONS.includes(userRegionFromIp)) return userRegionFromIp

    return null
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
              activeItem={this.getLocationText()}
            >
              <span className="state-label">State</span>
              <Button
                className="select-button"
                text={this.getLocationText() || 'Select your region'}
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
    const { userRegionFromSelection } = this.state

    return (
      <SubscribeForm
        onClose={this.props.onClose}
        isOpen={this.props.isOpen}
        userRegionFromSelection={userRegionFromSelection}
      />
    )
  }

  renderRegistration (): ReactNode {
    if (process.env.REACT_APP_SPARKSWAP_KYC === 'true') {
      return <RegisterSparkswapKYC region={this.state.userRegionFromSelection} isOpen={this.props.isOpen} onClose={this.props.onClose} />
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
    const { userConfirmedRegion } = this.state
    return !userConfirmedRegion ? this.renderLocationSelection() : this.maybeRenderRegistration()
  }
}
