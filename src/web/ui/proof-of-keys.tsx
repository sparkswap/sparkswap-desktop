import React, { ReactNode } from 'react'
import { Dialog } from '@blueprintjs/core'
import { showProofOfKeys, updater, doneWithProofOfKeys } from '../domain/proof-of-keys'

interface ProofOfKeysDialogState {
  isOpen: boolean
}

export class ProofOfKeysDialog extends React.Component<{}, ProofOfKeysDialogState> {
  constructor (props: {}) {
    super(props)
    this.state = {
      isOpen: showProofOfKeys
    }
  }

  onUpdate = (isOpen: boolean): void => {
    this.setState({ isOpen })
  }

  componentDidMount (): void {
    updater.on('update', this.onUpdate)
  }

  componentWillUnmount (): void {
    updater.removeListener('update', this.onUpdate)
  }

  handleClose = (): void => {
    // no need to await, if we don't commit to long term memory
    // the worst that happens is we show the pop-up again
    doneWithProofOfKeys()
    // we should close automatically, but we close immediately
    // so as to get the immediate feedback
    this.setState({ isOpen: false })
  }

  render (): ReactNode {
    return (
      <Dialog
        isOpen={this.state.isOpen}
        onClose={this.handleClose}
        title="Proof of Keys"
      >
      </Dialog>
    )
  }
}
