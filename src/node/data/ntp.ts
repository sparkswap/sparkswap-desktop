// @ts-ignore
import ntpClient from 'ntp-client'

const NTP_SERVER = 'pool.ntp.org'
const NTP_PORT = 123

export function getNetworkTime (): Promise<Date> {
  return new Promise((resolve, reject) => {
    ntpClient.getNetworkTime(NTP_SERVER, NTP_PORT,
      (error: Error, date: Date) => error ? reject(error) : resolve(date))
  })
}
