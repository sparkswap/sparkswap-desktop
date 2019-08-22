import React, { ReactNode } from 'react'
import { Tooltip, Icon } from '@blueprintjs/core'
import './InlineTooltip.css'

interface InlineTooltipProps {
  content: string
}

class InlineTooltip extends React.Component<InlineTooltipProps> {
  render (): ReactNode {
    return (
      <div className='InlineTooltip'>
        <Tooltip content={this.props.content}>
          <span>{this.props.children} <Icon className='InlineIcon' icon='help'/></span>
        </Tooltip>
      </div>
    )
  }
}

export default InlineTooltip
