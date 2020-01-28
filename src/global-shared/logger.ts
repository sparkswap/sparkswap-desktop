export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LoggerTransport {
  write (time: Date, level: LogLevel, message: string): void
}

export function formatLogLine (time: Date, level: LogLevel, message: string): string {
  return `${time.toISOString()} ${level} ${message}`
}

class ConsoleTransport implements LoggerTransport {
  write (time: Date, level: LogLevel, message: string): void {
    console[level](formatLogLine(time, level, message))
  }
}

export interface LoggerInterface {
  debug (message: string): void,
  info (message: string): void,
  warn (message: string): void,
  error (message: string): void
}

export interface ConfigurableLoggerInterface extends LoggerInterface {
  addTransport (transport: LoggerTransport): LoggerTransport
}

class Logger implements ConfigurableLoggerInterface {
  private transports: LoggerTransport[]

  constructor (defaultTransport?: LoggerTransport) {
    this.transports = []
    if (defaultTransport) {
      this.addTransport(defaultTransport)
    }
  }

  addTransport (transport: LoggerTransport): LoggerTransport {
    this.transports.push(transport)
    return transport
  }

  debug (message: string): void {
    this.write(LogLevel.DEBUG, message)
  }
  info (message: string): void {
    this.write(LogLevel.INFO, message)
  }
  warn (message: string): void {
    this.write(LogLevel.WARN, message)
  }
  error (message: string): void {
    this.write(LogLevel.ERROR, message)
  }

  private write (level: LogLevel, message: string): void {
    const time = new Date()
    this.transports.forEach(transport => {
      transport.write(time, level, message)
    })
  }
}

export default new Logger(new ConsoleTransport())
