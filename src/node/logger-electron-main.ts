import { ipcMain } from 'electron'
import { enumStringKeys } from '../global-shared/util'
import { LogLevel, LoggerInterface } from '../global-shared/logger'

export function pipeFromRenderer (logger: LoggerInterface): void {
  enumStringKeys(LogLevel).forEach(level => {
    ipcMain.on(`logger:${LogLevel[level]}`, (_evt: unknown, msg: string) => {
      logger[LogLevel[level]](`[renderer] ${msg}`)
    })
  })
}
