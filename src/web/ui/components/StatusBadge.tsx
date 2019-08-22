import React, { ReactNode } from 'react'
import { Intent, Classes } from '@blueprintjs/core'
import './StatusBadge.css'

interface StatusBadgeProps {
  size?: number,
  intent?: Intent,
  pulse?: boolean
}

interface DefaultProps {
  size: number,
  intent: Intent,
  pulse: boolean
}

class StatusBadge extends React.Component<StatusBadgeProps> {
  static defaultProps: DefaultProps = {
    size: 3,
    intent: Intent.NONE,
    pulse: false
  }

  get className (): string {
    const names = [
      'StatusBadge',
      Classes.intentClass(this.props.intent),
      this.props.pulse ? 'pulse' : ''
    ]

    return names.filter(Boolean).join(' ')
  }

  render (): ReactNode {
    const size = this.props.size || StatusBadge.defaultProps.size

    return (
      <span className={this.className} style={{ borderWidth: `${size}px`, fontSize: `${size * 2}px` }}></span>
    )
  }
}

export default StatusBadge
