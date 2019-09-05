import React, { ReactNode } from 'react'
import { Intent, Classes } from '@blueprintjs/core'
import './StatusBadge.css'

interface StatusBadgeProps {
  size?: number,
  intent?: Intent
}

interface DefaultProps {
  size: number,
  intent: Intent
}

const PULSE_LEVELS = Object.freeze({
  [Intent.NONE]: 0,
  [Intent.PRIMARY]: 0,
  [Intent.SUCCESS]: 0,
  [Intent.WARNING]: 1,
  [Intent.DANGER]: 2
})

class StatusBadge extends React.Component<StatusBadgeProps> {
  static defaultProps: DefaultProps = {
    size: 3,
    intent: Intent.NONE
  }

  get className (): string {
    const pulseLevel = PULSE_LEVELS[this.props.intent || StatusBadge.defaultProps.intent]
    const names = [
      'StatusBadge',
      Classes.intentClass(this.props.intent),
      pulseLevel ? `pulse-${pulseLevel}` : ''
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
