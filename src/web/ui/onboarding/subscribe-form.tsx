import React, { ReactNode } from 'react'
import { Button, Classes, Dialog, FormGroup, InputGroup } from '@blueprintjs/core'
import { ZAPIER_HOOK } from '../../../common/config'
import { showErrorToast, showSuccessToast } from '../AppToaster'
import { OTHER_REGION } from './regions'

interface SubscribeFormState {
  email: string,
  region: string
}

interface SubscribeFormProps {
  onClose: Function,
  isOpen: boolean,
  userRegionFromSelection: string
}

export class SubscribeForm extends React.Component<SubscribeFormProps, SubscribeFormState> {
  constructor (props: SubscribeFormProps) {
    super(props)
    const defaultRegion = props.userRegionFromSelection === OTHER_REGION ? '' : props.userRegionFromSelection

    this.state = {
      email: '',
      region: defaultRegion
    }
  }

  get unapprovedLocationText (): ReactNode {
    const { userRegionFromSelection } = this.props
    const outsideUnitedStates = userRegionFromSelection === OTHER_REGION

    const unapprovedState = (
      <React.Fragment>
        <p>We do not currently support users in {userRegionFromSelection}.</p>
        <p>Get notified when we expand to serve {userRegionFromSelection}.</p>
      </React.Fragment>
    )

    const unapprovedCountry = (
      <React.Fragment>
        <p>Currently, we only support users in the United States.</p>
        <p>Get notified when we expand to serve your country.</p>
      </React.Fragment>
    )

    return outsideUnitedStates ? unapprovedCountry : unapprovedState
  }

  handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      email: e.target.value.trim()
    })
  }

  handleRegionChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      region: e.target.value
    })
  }

  handleSubmit = async (e: React.MouseEvent<HTMLElement>): Promise<void> => {
    e.preventDefault()
    const { email, region } = this.state

    const data = { email, region }
    const res = await fetch(ZAPIER_HOOK, {
      method: 'POST',
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      showErrorToast('Failed to signup. Please try again.')
      return
    }

    showSuccessToast('Successfully signed up for updates to your region.')
    this.props.onClose()
  }

  render (): ReactNode {
    const { email, region } = this.state
    const regionLabel = this.props.userRegionFromSelection === OTHER_REGION ? 'Country' : 'State'

    return (
      <Dialog
        title="Unapproved Location"
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
      >
        <div className={Classes.DIALOG_BODY}>
          {this.unapprovedLocationText}
          <div className="SubscribeForm">
            <form>
              <FormGroup
                labelFor="email"
                label="Email"
              >
                <InputGroup
                  name="Email"
                  id="email"
                  placeholder="satoshi@anonymousspeech.com"
                  value={email}
                  onChange={this.handleEmailChange}
                />
              </FormGroup>
              <FormGroup
                labelFor="region"
                label={regionLabel}
              >
                <InputGroup
                  name="Region"
                  id="region"
                  placeholder={`${regionLabel} of primary residence`}
                  value={region}
                  onChange={this.handleRegionChange}
                />
              </FormGroup>
            </form>
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
              text="Subscribe to Updates"
              onClick={this.handleSubmit}
              className='RegisterButton'
              fill={true}
            />
          </div>
        </div>
      </Dialog>
    )
  }
}
