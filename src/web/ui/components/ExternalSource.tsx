import React, { ReactNode } from 'react'
import { Button, IButtonProps } from '@blueprintjs/core'
import { openLinkInBrowser } from '../../domain/main-request'

interface ExternalButtonProps extends IButtonProps {
  href: string
}

export class ExternalButton extends React.Component<ExternalButtonProps> {
  handleClick = (e: React.MouseEvent<HTMLElement>): void => {
    e.preventDefault()
    openLinkInBrowser(this.props.href)
    if (this.props.onClick) this.props.onClick(e)
  }

  render (): ReactNode {
    return (
      <Button
        text={this.props.text}
        icon={this.props.icon}
        rightIcon={this.props.rightIcon}
        onClick={this.handleClick}
        className={this.props.className}
        large={this.props.large}
        loading={this.props.loading}
        fill={this.props.fill}
      >
        {this.props.children}
      </Button>
    )
  }
}

interface ExternalLinkProps {
  href: string,
  className?: string,
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export class ExternalLink extends React.Component<ExternalLinkProps> {
  handleClick = (e: React.MouseEvent<HTMLElement>): void => {
    e.preventDefault()
    openLinkInBrowser(this.props.href)
    if (this.props.onClick) this.props.onClick(e)
  }

  render (): ReactNode {
    return (
      <a
        href={this.props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={this.props.className}
        onClick={this.handleClick}
      >
        {this.props.children}
      </a>
    )
  }
}
