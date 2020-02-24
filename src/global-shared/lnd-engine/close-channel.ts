import { Nullable } from '../types'
import {
  LndActionOptions,
  CloseChannelResponse
} from '../types/lnd-engine/client'
import { GrpcError } from '../types/lnd-engine/client/grpc'
import {
  isPendingCloseResponse,
  isChannelCloseUpdateResponse,
  txidBytesToTxid
} from './utils'

export function closeChannel (channelPointStr: string, force: boolean,
  { client, logger }: LndActionOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const [fundingTxidStr, outputIndex] = channelPointStr.split(':')
      const channelPoint = {
        fundingTxidStr,
        outputIndex: parseInt(outputIndex, 10)
      }
      const call = client.closeChannel({ channelPoint, force })

      // Our `finish` helper is used in a circular manner, so we
      // ignore the eslint warning
      /* eslint-disable @typescript-eslint/no-use-before-define */

      const errorListener = (err: GrpcError): void => {
        logger.error(`Error from closeChannel stream: ${err.message}`)
        finish(err)
      }

      const endListener = (): void => {
        const error = 'LND closed closeChannel stream before returning our value'
        logger.error(error)
        finish(new Error(error))
      }

      const dataListener = (update: CloseChannelResponse): void => {
        if (isPendingCloseResponse(update)) {
          const txid = txidBytesToTxid(update.closePending.txid)
          logger.info(`Closing channel with tx: ${txid}`)
          return finish(null, txid)
        }
        if (isChannelCloseUpdateResponse(update)) {
          const txid = txidBytesToTxid(update.chanClose.closingTxid)
          logger.info(`Channel closed with tx: ${txid}`)
          finish(null, txid)
        }
      }

      const finish = (err: Nullable<Error>, response?: string): void => {
        call.removeListener('error', errorListener)
        call.removeListener('end', endListener)
        call.removeListener('data', dataListener)

        if (err || !response) {
          reject(err || new Error('Invalid empty response for channel close.'))
          return
        }

        resolve(response)
      }

      /* eslint-enable @typescript-eslint/no-use-before-define */

      call.on('error', errorListener)
      call.on('end', endListener)
      call.on('data', dataListener)
    } catch (e) {
      return reject(e)
    }
  })
}
