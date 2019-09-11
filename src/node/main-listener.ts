import { ipcMain } from 'electron'
import { logger } from '../common/utils'

// eslint-disable-next-line
export function listen (name: string, handler: (_: any) => any): void {
  ipcMain.on(name, async (event, { id, payload }) => {
    try {
      const response = await handler(payload)
      event.reply(`${name}:${id}`, { response })
    } catch (error) {
      logger.error(`Encountered error when running ${name}`, error)
      event.reply(`${name}:${id}`, { error: error.message })
    }
  })
}

// eslint-disable-next-line
export function listenSync (name: string, handler: (_: any) => any): void {
  ipcMain.on(name, (event, { payload }) => {
    try {
      const response = handler(payload)
      event.returnValue = { response }
    } catch (e) {
      logger.error(`Encountered error when running ${name}`, e)
      event.returnValue = { error: e.message }
    }
  })
}

export function close (): void {
  // TODO: is this a bug?
  // @ts-ignore
  ipcMain.removeAllListeners()
}
