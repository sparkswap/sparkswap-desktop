let fs: any = null // eslint-disable-line
let logFile: number | null = null

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
  const line = formatLogLine(level, message)
  console[level](line)
  if (logFile) {
    fs.write(logFile, line + '\n', () => true)
  }
}

export async function openLogFile (filepath: string): Promise<void> {
  // we import dynamically so that we can use this module in the browser
  return import('fs').then(imported => {
    fs = imported
    logFile = fs.openSync(filepath, 'a')
  })
}

export function closeLogFile (): void {
  if (logFile) {
    fs.closeSync(logFile)
    logFile = null
  }
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
