import React, { ReactNode } from 'react'
import {
  Classes,
  Icon,
  IconName,
  Spinner,
  Intent
} from '@blueprintjs/core'
import { Nullable } from '../../../global-shared/types'

// Slightly longer than the CSS transition of 1s
const PULSE_TIME_MS = 1100

export enum PulseColor {
  Red,
  Green,
  Gray
}

const PULSE_CLASSES = Object.freeze({
  [PulseColor.Red]: 'PulseRed',
  [PulseColor.Green]: 'PulseGreen',
  [PulseColor.Gray]: 'PulseGray'
})

type FlexPulseColor = Nullable<PulseColor> | undefined

interface DisplayProps {
  className?: string,
  loading?: boolean,
  pulseColor: FlexPulseColor,
  resetPulse?: () => void
}

function applyPulse (newColor: FlexPulseColor, oldColor: FlexPulseColor,
  timer?: NodeJS.Timeout, resetPulse?: () => void): NodeJS.Timeout | undefined {
  if (newColor != null && oldColor !== newColor) {
    if (timer) {
      clearTimeout(timer)
    }
    if (resetPulse) {
      return setTimeout(resetPulse, PULSE_TIME_MS)
    }
  }
}

export class DisplayValue extends React.Component<DisplayProps, {}> {
  timer?: NodeJS.Timeout

  componentDidUpdate (prevProps: DisplayProps): void {
    this.timer = applyPulse(this.props.pulseColor, prevProps.pulseColor,
      this.timer, this.props.resetPulse)
  }

  get className (): string {
    const classes: string[] = []

    if (this.props.className) {
      classes.push(this.props.className)
    }

    if (this.props.loading) {
      classes.push(Classes.SKELETON)
    }

    if (this.props.pulseColor != null) {
      classes.push(PULSE_CLASSES[this.props.pulseColor])
    }

    return classes.join(' ')
  }

  render (): ReactNode {
    return (
      <span className={this.className}>
        {this.props.children}
      </span>
    )
  }
}

interface DisplayIconProps extends DisplayProps {
  icon: IconName,
  intent?: Intent
}

export class DisplayIcon extends React.Component<DisplayIconProps, {}> {
  timer?: NodeJS.Timeout

  componentDidUpdate (prevProps: DisplayIconProps): void {
    this.timer = applyPulse(this.props.pulseColor, prevProps.pulseColor,
      this.timer, this.props.resetPulse)
  }

  get className (): string {
    const classes: string[] = []

    if (this.props.className) {
      classes.push(this.props.className)
    }

    const hasIntent = this.props.intent && this.props.intent !== Intent.NONE

    // don't apply the pulse if we have an icon intent,
    // otherwise the colors will act in unexpected ways
    if (!hasIntent && this.props.pulseColor != null) {
      classes.push(PULSE_CLASSES[this.props.pulseColor])
    }

    return classes.join(' ')
  }

  render (): ReactNode {
    if (this.props.loading) {
      return (
        <Spinner
          className={this.props.className}
          size={16}
        />
      )
    }

    return (
      <Icon
        icon={this.props.icon}
        intent={this.props.intent}
        className={this.className}
      />
    )
  }
}
