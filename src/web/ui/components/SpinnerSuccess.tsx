import React, { ReactNode } from 'react'
import { Spinner, Icon, Intent } from '@blueprintjs/core'
import './SpinnerSuccess.css'

interface SpinnerSuccessProps {
  size?: number,
  className?: string
}

class SpinnerSuccess extends React.Component<SpinnerSuccessProps, {}> {
  get className (): string {
    const classes = [this.props.className || '', 'SpinnerSuccess']

    return classes.filter(Boolean).join(' ')
  }

  get marginTop (): number {
    const size = this.props.size || Spinner.SIZE_STANDARD

    return Math.floor(size / 2) + 10
  }

  render (): ReactNode {
    const size = this.props.size || Spinner.SIZE_STANDARD

    return (
      <div className={this.className}>
        <Icon
          iconSize={size / 2}
          icon='tick'
          intent={Intent.SUCCESS}
          style={{ marginTop: `-${(size / 4)}px`, marginLeft: `-${(size / 4)}px` }}
        />
        <Spinner className={this.className} size={size} intent={Intent.SUCCESS} value={1} />
      </div>
    )
  }
}

export default SpinnerSuccess
