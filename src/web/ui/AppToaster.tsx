import React from 'react'
import ReactDOM from 'react-dom'
import logger from '../../global-shared/logger'
import { openBeacon } from './beacon'
import './AppToaster.css'
import {
  IActionProps,
  IToastProps,
  IToasterProps,
  Toaster,
  Position,
  Spinner,
  Intent
} from '@blueprintjs/core'

interface AppToastProps extends IToastProps {
  hideDismiss?: boolean,
  loading?: boolean
}

function getClassName (props: AppToastProps): string {
  const names = [props.className]
  if (props.hideDismiss) {
    names.push('hide-dismiss')
  }
  if (props.loading) {
    names.push('loading')
  }

  return names.filter(Boolean).join(' ')
}

function getAction (props: AppToastProps): React.ReactNode {
  if (props.loading) {
    if (props.action) {
      logger.warn('Action prop will override loading prop in Toast')
    } else {
      return {
        disabled: false,
        text: <Spinner size={15} intent={props.intent} />
      }
    }
  }

  return props.action
}

class AppToaster extends Toaster {
  show (props: AppToastProps, key?: string): string {
    const toastProps = Object.assign({}, props, {
      className: getClassName(props),
      action: getAction(props)
    })

    delete toastProps.hideDismiss

    return super.show(toastProps, key)
  }
}

function createAppToaster (props?: IToasterProps, container = document.body): AppToaster {
  const containerElement = document.createElement('div')
  container.appendChild(containerElement)
  const toaster = ReactDOM.render<IToasterProps>(
    <AppToaster {...props} usePortal={false} />,
    containerElement
  ) as AppToaster
  if (toaster == null) {
    throw new Error('Error creating toaster')
  }
  return toaster
}

export const toaster = createAppToaster({
  className: 'AppToaster',
  position: Position.TOP
})

export function showErrorToast (message: string, action?: IActionProps): void {
  toaster.show({ message, intent: Intent.DANGER, action })
}

export function showSupportToast (message: string): void {
  showErrorToast(message, {
    text: 'Contact support',
    onClick: openBeacon
  })
}

export function showSuccessToast (message: string, action?: IActionProps): void {
  toaster.show({ message, intent: Intent.SUCCESS, action })
}

export function showLoadingToast (message: string): () => void {
  const toastId = toaster.show({
    message,
    timeout: 0,
    hideDismiss: true,
    loading: true
  })

  return () => toaster.dismiss(toastId)
}
