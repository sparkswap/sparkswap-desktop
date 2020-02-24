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
        <span>
          {this.props.children}
          <Tooltip content={this.props.content}>
            <Icon
              className='InlineIcon'
              icon='help'
              iconSize={12}
            />
          </Tooltip>
        </span>
      </div>
    )
  }
}

export default InlineTooltip
