import { createWriteStream, WriteStream } from 'fs'
import { LogLevel, LoggerTransport, formatLogLine } from './logger'

export class FileTransport implements LoggerTransport {
  private stream: WriteStream

  constructor (filepath: string) {
    this.stream = createWriteStream(filepath, {
      flags: 'a'
    })
  }

  write (time: Date, level: LogLevel, message: string): void {
    this.stream.write(formatLogLine(time, level, message) + '\n')
  }

  close (): void {
    this.stream.end()
  }
}
