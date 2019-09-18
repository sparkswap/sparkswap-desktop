
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

function formatLogLine (level: LogLevel, message: string): string {
  const timestamp = (new Date()).toISOString()
  return `${timestamp} ${level} ${message}`
}

function printLogLine (level: LogLevel, message: string): void {
  console[level](formatLogLine(level, message))
}

export interface LoggerInterface {
  debug (message: string): void,
  info (message: string): void,
  warn (message: string): void,
  error (message: string): void
}

class Logger implements LoggerInterface {
  debug (message: string): void { printLogLine(LogLevel.DEBUG, message) }
  info (message: string): void { printLogLine(LogLevel.INFO, message) }
  warn (message: string): void { printLogLine(LogLevel.WARN, message) }
  error (message: string): void { printLogLine(LogLevel.ERROR, message) }
}

export default new Logger()
