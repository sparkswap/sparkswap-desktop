import React, { ReactNode } from 'react'
import { H2, Button, FocusStyleManager } from '@blueprintjs/core'
import './FullScreenOverlay.css'

// Removes blue border on blueprintjs elements
// @see: https://github.com/palantir/blueprint/issues/2691
FocusStyleManager.onlyShowFocusOnTabs()

interface FullScreenOverlayProps {
  isOpen: boolean,
  onClose?: Function,
  title?: string,
  showHomeButton?: boolean
}

class FullScreenOverlay extends React.Component<FullScreenOverlayProps> {
  handleClose = () => {
    if (this.props.onClose) this.props.onClose()
  }

  maybeRenderHomeButton (): ReactNode {
    if (this.props.showHomeButton) {
      return (
        <Button onClick={this.handleClose} className="home-button" icon="home" minimal={true}>
        </Button>
      )
    }
  }

  render (): ReactNode {
    return (
      <div className="bp3-portal" style={{ display: this.props.isOpen ? 'block' : 'none' }}>
        <div className="bp3-overlay bp3-overlay-open FullScreenOverlay">
          {this.maybeRenderHomeButton()}
          <div className="bp3-overlay-backdrop"></div>
          <div className="ContentWrapper bp3-overlay-content">
            <div className='Title'>
              <H2>{this.props.title}</H2>
            </div>
            <div className='Body'>
              {this.props.children}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default FullScreenOverlay
