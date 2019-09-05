import React, { ReactNode } from 'react'
import { Spinner, ISpinnerProps } from '@blueprintjs/core'
import './SpinnerMessage.css'

interface SpinnerMessageProps extends ISpinnerProps {
  message?: string
}

class SpinnerMessage extends React.Component<SpinnerMessageProps, {}> {
  get className (): string {
    const classes = [this.props.className, 'SpinnerMessage']

    return classes.filter(Boolean).join(' ')
  }

  get marginTop (): number {
    const size = this.props.size || Spinner.SIZE_STANDARD

    return Math.floor(size / 2) + 10
  }

  render (): ReactNode {
    const { message } = this.props
    const spinnerProps = Object.assign({}, this.props, { message: undefined })

    return (
      <div className={this.className}>
        <span className='message' style={{ marginTop: `${this.marginTop}px` }}>{message}</span>
        <Spinner {...spinnerProps} />
      </div>
    )
  }
}

export default SpinnerMessage
