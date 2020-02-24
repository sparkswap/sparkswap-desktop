import React, { ReactNode } from 'react'
import {
  NonIdealState
} from '@blueprintjs/core'
import './EmptyableList.css'

interface EmptyableListProps {
  name: string,
  longName?: string,
  className?: string
}

function capitalize (str: string): string {
  return str.split(' ').map(part => {
    return part.slice(0, 1).toUpperCase() + part.slice(1)
  }).join(' ')
}

function isChildValid (elem: ReactNode): boolean {
  if (!elem) {
    return false
  }

  if (Array.isArray(elem) && !elem.filter(isChildValid).length) {
    return false
  }

  return true
}

class EmptyableList extends React.Component<EmptyableListProps, {}> {
  get className (): string {
    const classes = ['EmptyableList']
    if (this.props.className) {
      classes.push(this.props.className)
    }

    return classes.join(' ')
  }

  render (): ReactNode {
    const {
      name,
      longName,
      children
    } = this.props

    if (!isChildValid(children)) {
      return (
        <div className={this.className}>
          <NonIdealState
            title={`No ${capitalize(name)}`}
            description={`You don't have any ${longName || name} yet. When you do, they'll show up here.`}
            icon='inbox'
          />
        </div>
      )
    }

    return (
      <div className={this.className}>
        {this.props.children}
      </div>
    )
  }
}

export default EmptyableList
