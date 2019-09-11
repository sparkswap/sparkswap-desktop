import React, { ReactNode } from 'react'
import './DownloadProgress.css'
import { updater as downloadUpdater, EVENTS } from '../domain/download-progress'
import { Classes, Dialog, Spinner, Intent } from '@blueprintjs/core'
import { delay } from '../../global-shared/util'

const TIME_REMAINING_START = 6
const TIME_REMAINING_ANIMATION_INTERVAL = 1 / 5
const TIME_REMAINING_STEP = 0.05

interface DownloadProgressState {
  downloadStarted: boolean,
  isQuitting: boolean,
  progressPercent?: number,
  timeRemaining: number
}

class DownloadProgress extends React.Component<{}, DownloadProgressState> {
  constructor (props = {}) {
    super(props)

    this.state = {
      downloadStarted: false,
      isQuitting: false,
      progressPercent: undefined,
      timeRemaining: TIME_REMAINING_START
    }
  }

  startTimeRemaining = async (): Promise<void> => {
    while (this.state.timeRemaining > 0) {
      await delay(50)
      this.setState({ timeRemaining: parseFloat((this.state.timeRemaining - TIME_REMAINING_STEP).toFixed(2)) })
    }
  }

  handleDownloadStart = (): void => {
    this.setState({ downloadStarted: true })
  }

  handleDownloadProgress = (progressPercent: number): void => {
    this.setState({ progressPercent })
  }

  handleDownloadRestart = (): void => {
    this.setState({ progressPercent: 0 })
    this.setState({ isQuitting: true })
    this.startTimeRemaining()
  }

  componentDidMount (): void {
    downloadUpdater.on(EVENTS.DOWNLOAD_STARTED, this.handleDownloadStart)
    downloadUpdater.on(EVENTS.DOWNLOAD_PROGRESS, this.handleDownloadProgress)
    downloadUpdater.on(EVENTS.DOWNLOAD_RESTART, this.handleDownloadRestart)
  }

  componentWillUnmount (): void {
    downloadUpdater.removeListener(EVENTS.DOWNLOAD_STARTED, this.handleDownloadStart)
    downloadUpdater.removeListener(EVENTS.DOWNLOAD_PROGRESS, this.handleDownloadProgress)
    downloadUpdater.removeListener(EVENTS.DOWNLOAD_RESTART, this.handleDownloadRestart)
  }

  get downloadProgress (): number | undefined {
    return this.state.progressPercent
      ? this.state.progressPercent * 0.01
      : undefined
  }

  get downloadText (): ReactNode {
    const textDuringDownload = (
      <p>Sparkswap will close and relaunch once the update is downloaded.</p>
    )

    const textDuringQuit = (
      <p>Sparkswap Desktop is closing in {parseInt(this.state.timeRemaining.toString())} seconds...</p>
    )

    return this.state.isQuitting
      ? textDuringQuit
      : textDuringDownload
  }

  render (): React.ReactNode {
    const spinnerValue = this.state.isQuitting
      ? (TIME_REMAINING_START - this.state.timeRemaining) * TIME_REMAINING_ANIMATION_INTERVAL
      : this.downloadProgress

    const spinnerIntent = this.state.isQuitting
      ? Intent.SUCCESS
      : undefined

    const shouldDialogOpen =
      (this.state.downloadStarted || this.state.isQuitting)

    return (
      <React.Fragment>
        <Dialog isOpen={shouldDialogOpen}>
          <div className={`${Classes.DIALOG_BODY} download-progress-dialog`}>
            {this.downloadText}
          </div>
          <Spinner
            size={40}
            className='download-progress-spinner'
            value={spinnerValue}
            intent={spinnerIntent}
          />
        </Dialog>
      </React.Fragment>
    )
  }
}

export default DownloadProgress
