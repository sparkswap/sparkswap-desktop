import React, { ReactNode } from 'react'
import { Button, Classes, Dialog, FormGroup, InputGroup } from '@blueprintjs/core'
import { ZAPIER_HOOK } from '../../../common/config'
import { showErrorToast, showSuccessToast } from '../AppToaster'
import { OTHER_JURISDICTION } from './jurisdictions'

interface SubscribeFormState {
  email: string,
  jurisdiction: string
}

interface SubscribeFormProps {
  onClose: Function,
  isOpen: boolean,
  jurisdiction: string
}

export class SubscribeForm extends React.Component<SubscribeFormProps, SubscribeFormState> {
  constructor (props: SubscribeFormProps) {
    super(props)
    const defaultJurisdiction = props.jurisdiction === OTHER_JURISDICTION ? '' : props.jurisdiction

    this.state = {
      email: '',
      jurisdiction: defaultJurisdiction
    }
  }

  get unapprovedJurisdictionText (): ReactNode {
    const { jurisdiction } = this.props
    const outsideUnitedStates = jurisdiction === OTHER_JURISDICTION

    const unapprovedState = (
      <React.Fragment>
        <p>We do not currently support users in {jurisdiction}.</p>
        <p>Get notified when we expand to serve {jurisdiction}.</p>
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

  handleJurisdictionChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      jurisdiction: e.target.value
    })
  }

  handleSubmit = async (e: React.MouseEvent<HTMLElement>): Promise<void> => {
    e.preventDefault()
    const { email, jurisdiction } = this.state

    // Zapier expects the property `region`
    const data = { email, region: jurisdiction }
    const res = await fetch(ZAPIER_HOOK, {
      method: 'POST',
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      showErrorToast('Failed to signup. Please try again.')
      return
    }

    showSuccessToast('Successfully signed up for updates to your jurisdiction.')
    this.props.onClose()
  }

  render (): ReactNode {
    const { email, jurisdiction } = this.state
    const jurisdictionLabel = this.props.jurisdiction === OTHER_JURISDICTION ? 'Country' : 'State'

    return (
      <Dialog
        title="Unapproved Jurisdiction"
        isOpen={this.props.isOpen}
        onClose={() => this.props.onClose()}
      >
        <div className={Classes.DIALOG_BODY}>
          {this.unapprovedJurisdictionText}
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
                labelFor="jurisdiction"
                label={jurisdictionLabel}
              >
                <InputGroup
                  name="Jurisdiction"
                  id="jurisdiction"
                  placeholder={`${jurisdictionLabel} of primary residence`}
                  value={jurisdiction}
                  onChange={this.handleJurisdictionChange}
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
