import React, { ReactNode } from 'react'
import { Dialog, Classes, Button, Tooltip, PopoverInteractionKind } from '@blueprintjs/core'
import { showProofOfKeys, updater, doneWithProofOfKeys } from '../domain/proof-of-keys'
import { getProofOfKeys } from '../domain/server'
import { PROOF_HOST } from '../../common/config'
import logger from '../../global-shared/logger'
import { ExternalLink, ExternalButton } from './components/ExternalSource'
import TileImage from './assets/sparkswap-tile.jpg'
import TwitterLogo from './assets/twitter.svg'
import './proof-of-keys-dialog.css'

interface ProofOfKeysDialogState {
  isOpen: boolean,
  hasTweeted: boolean,
  proofId?: string,
  signature?: string,
  message?: string
}

interface TweetIntentParams {
  text: string,
  url: string,
  [index: string]: string
}

function getTweetIntent (params: TweetIntentParams): string {
  const paramsStr = Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')
  return `https://twitter.com/intent/tweet?${paramsStr}`
}

export class ProofOfKeysDialog extends React.Component<{}, ProofOfKeysDialogState> {
  constructor (props: {}) {
    super(props)
    this.state = {
      hasTweeted: false,
      isOpen: showProofOfKeys
    }
  }

  onUpdate = async (isOpen: boolean): Promise<void> => {
    try {
      if (isOpen) {
        const { publicId, signature, message } = await getProofOfKeys()
        this.setState({
          proofId: publicId,
          signature,
          message
        })
      }
      this.setState({ isOpen })
    } catch (e) {
      logger.error(`Failed to show proof of keys dialog: ${e}`)
    }
  }

  componentDidMount (): void {
    updater.on('update', this.onUpdate)
  }

  componentWillUnmount (): void {
    updater.removeListener('update', this.onUpdate)
  }

  get proofUrl (): string {
    return this.state.proofId ? `${PROOF_HOST}/proof/${this.state.proofId}` : ''
  }

  get badgeUrl (): string {
    return this.proofUrl ? `${this.proofUrl}/badge.png` : ''
  }

  handleClose = (): void => {
    // no need to await, if we don't commit to long term memory
    // the worst that happens is we show the pop-up again
    doneWithProofOfKeys()
    // we should close automatically, but we close immediately
    // so as to get the immediate feedback
    this.setState({ isOpen: false })
  }

  renderFooter (): ReactNode {
    if (this.state.hasTweeted) {
      return (
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text="Done"
              onClick={this.handleClose}
              fill={true}
            />
          </div>
        </div>
      )
    }

    const tweetParams = {
      text: `${this.state.message}\n\nProof: ${this.state.signature}`,
      url: this.proofUrl
    }

    return (
      <div className={Classes.DIALOG_FOOTER}>
        <Button minimal={true} text="Back to app" onClick={this.handleClose} />
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <ExternalButton
            icon={<img src={TwitterLogo} width={15} alt='Twitter' />}
            href={getTweetIntent(tweetParams)}
            fill={true}
            onClick={() => this.setState({ hasTweeted: true })}
          >
            Tweet your Proof of Keys
          </ExternalButton>
        </div>
      </div>
    )
  }

  render (): ReactNode {
    return (
      <Dialog
        className="ProofOfKeysDialog"
        isOpen={this.state.isOpen}
        onClose={this.handleClose}
        title="Proof of Keys"
        portalClassName="bp3-portal portal-behind"
      >
        <div className={Classes.DIALOG_BODY}>
          <p>
            Congratulations! You just received your instant proof of keys by buying Bitcoin from Sparkswap.
          </p>
          <p>
            <ExternalLink className="proof-link" href={this.proofUrl}>
              <img className="proof-badge" src={this.badgeUrl} alt="Proof of Keys Badge"/>
              Link to full Proof of Keys
            </ExternalLink>
          </p>
          <p>Share your Proof of Keys on Twitter and as a thank you, we&apos;ll send you a{' '}
            <Tooltip
              className={Classes.TOOLTIP_INDICATOR}
              interactionKind={PopoverInteractionKind.HOVER}
              content={
                <div className="tile-tooltip">
                  <ExternalLink href="https://www.thetileapp.com/en-us/store/tiles/mate">
                    <img src={TileImage} width={200} alt="Sparkswap-branded Tile Mate" />
                    The Tile Mate (thetileapp.com)
                  </ExternalLink>
                </div>
              }
              lazy={false}
              hoverCloseDelay={200}
            >
              Sparkswap-branded Tile
            </Tooltip>
            , so you&apos;ll never lose your keys!
          </p>
        </div>
        {this.renderFooter()}
      </Dialog>
    )
  }
}
