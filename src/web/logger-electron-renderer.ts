import { LogLevel, LoggerTransport } from '../global-shared/logger'

export class RendererTransport implements LoggerTransport {
  write (_time: Date, level: LogLevel, message: string): void {
    window.ipcRenderer.send(`logger:${level}`, message)
  }
}

export default new RendererTransport()
