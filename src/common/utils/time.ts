import { Frequency, TimeUnit } from '../types'

const MILLISECONDS_PER_MINUTE = 60 * 1000
const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * 60
const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * 24
const MILLISECONDS_PER_WEEK = MILLISECONDS_PER_DAY * 7

const EPOCH_DATE = new Date(Date.UTC(1970, 0, 1))

function getMinutesSince (start: Date, since = EPOCH_DATE): number {
  return Math.floor((start.getTime() - since.getTime()) / MILLISECONDS_PER_MINUTE)
}

function getHoursSince (start: Date, since = EPOCH_DATE): number {
  return Math.floor((start.getTime() - since.getTime()) / MILLISECONDS_PER_HOUR)
}

function getDaysSince (start: Date, since = EPOCH_DATE): number {
  return Math.floor((start.getTime() - since.getTime()) / MILLISECONDS_PER_DAY)
}

function getWeeksSince (start: Date, since = EPOCH_DATE): number {
  return Math.floor((start.getTime() - since.getTime()) / MILLISECONDS_PER_WEEK)
}

function getMonthsSince (start: Date, since = EPOCH_DATE): number {
  const yearsSince = start.getUTCFullYear() - since.getUTCFullYear()
  return yearsSince * 12 + start.getUTCMonth() - since.getUTCMonth()
}

function getNextMinuteMs (start: Date, minutes: number, reference = EPOCH_DATE): number {
  return (getMinutesSince(start, reference) + minutes) * MILLISECONDS_PER_MINUTE
}

function getNextHourMs (start: Date, hours: number, reference = EPOCH_DATE): number {
  return (getHoursSince(start, reference) + hours) * MILLISECONDS_PER_HOUR
}

function getNextDayMs (start: Date, days: number, reference = EPOCH_DATE): number {
  return (getDaysSince(start, reference) + days) * MILLISECONDS_PER_DAY
}

function getNextWeekMs (start: Date, weeks: number, reference = EPOCH_DATE): number {
  return (getWeeksSince(start, reference) + weeks) * MILLISECONDS_PER_WEEK
}

function getNextMonthMs (start: Date, months: number, reference = EPOCH_DATE): number {
  const sinceMut = new Date(reference.getTime())
  return sinceMut.setUTCMonth(getMonthsSince(start, reference) + months) - reference.getTime()
}

const getNextMsFns = {
  [TimeUnit.MINUTES]: getNextMinuteMs,
  [TimeUnit.HOURS]: getNextHourMs,
  [TimeUnit.DAYS]: getNextDayMs,
  [TimeUnit.WEEKS]: getNextWeekMs,
  [TimeUnit.MONTHS]: getNextMonthMs
}

export function getNextTimeoutDuration (frequency: Frequency, start = new Date(), reference = EPOCH_DATE): number {
  const msFromSinceToNext = getNextMsFns[frequency.unit](start, frequency.interval, reference)
  return msFromSinceToNext + reference.getTime() - start.getTime()
}

export function getCronDate (date: Date): Date {
  const cronDate = new Date(date.getTime())
  cronDate.setUTCSeconds(0, 0)
  return cronDate
}

export function isStartOfInterval ({ unit, interval }: Frequency, since = EPOCH_DATE): boolean {
  const now = getCronDate(new Date())

  if (now.getUTCMinutes() !== since.getUTCMinutes()) {
    return false
  }

  switch (unit) {
    case TimeUnit.HOURS:
      return getHoursSince(now, since) % interval === 0
    case TimeUnit.DAYS:
      return getDaysSince(now, since) % interval === 0 && now.getUTCHours() === since.getUTCHours()
    case TimeUnit.WEEKS:
      return getWeeksSince(now, since) % interval === 0 && now.getUTCDay() === since.getUTCDay() &&
        now.getUTCHours() === since.getUTCHours()
    case TimeUnit.MONTHS:
      return getMonthsSince(now, since) % interval === 0 && now.getUTCDate() === since.getUTCDate() &&
        now.getUTCHours() === since.getUTCHours()
    default:
      throw new Error(`Unrecognized time unit ${unit}`)
  }
}
