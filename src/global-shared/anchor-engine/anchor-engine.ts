import {
  Amount,
  Asset,
  Unit,
  SwapHash,
  SwapPreimage,
  PaymentChannelNetworkAddress
} from '../types'
import { LoggerInterface } from '../logger'
import { delay, generateHash } from '../util'
import { MIN_FINAL_DELTA } from '../time-locks'

import * as api from './api'

const ANCHOR_ADDRESS_PREFIX = 'anchor:'

// Milliseconds between polling attempts of escrow status
const SUBSCRIBE_ESCROW_DELAY = 100

interface SwapInvoiceTerms {
  // USDX amount to use
  amount: number,
  // the date after which we should not accept new escrows
  expiration: Date,
  // number of seconds from when the escrow was created
  // to when it is expired
  timelockDelta: number
}

export class SettledSwapError extends Error {}
export class CanceledSwapError extends Error {}
export class ExpiredSwapError extends Error {}
export class PermanentSwapError extends Error {}

export function accountToAddress (accountId: string): PaymentChannelNetworkAddress {
  return `${ANCHOR_ADDRESS_PREFIX}${accountId}`
}

export function addressToAccount (address: PaymentChannelNetworkAddress): string {
  const accountId = address.split(ANCHOR_ADDRESS_PREFIX)[1]

  if (!accountId) {
    throw new Error(`Invalid Anchor Payment Address: ${address}`)
  }

  return accountId
}

function assertEscrowTerms (escrow: api.Escrow, terms: SwapInvoiceTerms): void {
  if (escrow.timeout <= new Date() || terms.expiration <= new Date()) {
    throw new ExpiredSwapError(`Swap with hash (${escrow.hash}) is expired.`)
  }

  // TODO: make currency dynamic
  if (escrow.amount.asset !== api.USDX) {
    throw new CanceledSwapError(`Swap with hash (${escrow.hash}) has invalid ` +
      `currency ${escrow.amount.asset}`)
  }

  if (escrow.amount.value !== terms.amount) {
    throw new CanceledSwapError(`Swap with hash (${escrow.hash}) has ` +
      `incorrect amount ${escrow.amount.value} vs ${terms.amount}`)
  }

  const escrowTimelock = Math.floor((escrow.timeout.getTime() - escrow.created.getTime()) / 1000)

  // TODO: do we need a minimum time lock here to give ourselves enough room to do the swap?
  // Should we base our calculation on the distance from the present?
  if (escrowTimelock < terms.timelockDelta) {
    throw new CanceledSwapError(`Swap with hash (${escrow.hash}) has ` +
      `incorrect time lock ${escrowTimelock} vs ${terms.timelockDelta}`)
  }
}

export class AnchorEngine {
  symbol: string
  name: string
  quantumsPerCommon: string
  logger: LoggerInterface

  static readonly ERRORS = {
    PermanentSwapError,
    ExpiredSwapError,
    CanceledSwapError,
    SettledSwapError
  }

  private apiKey: string
  private incomingSwaps: Map<SwapHash, SwapInvoiceTerms>
  private accountId?: string

  constructor (apiKey: string, { logger = console as LoggerInterface } = {}) {
    this.symbol = api.USDX
    this.name = 'AnchorUSD'
    this.quantumsPerCommon = '100'
    this.apiKey = apiKey
    this.incomingSwaps = new Map()
    this.logger = logger
  }

  get validated (): boolean {
    return true
  }

  async getPaymentChannelNetworkAddress (): Promise<PaymentChannelNetworkAddress> {
    return accountToAddress(await this.getAccountId())
  }

  private async createEscrowIdempotent (hash: SwapHash, address: PaymentChannelNetworkAddress, amount: Amount, expiration: Date, finalDelta: number): Promise<api.Escrow> {
    const fromId = await this.getAccountId()
    const recipientId = addressToAccount(address)
    const escrow = await api.getEscrowByHash(this.apiKey, hash, fromId)

    if (escrow) return escrow

    // Convert the maximum time into a time from now.
    // We round down to a whole number of seconds to
    // be conservative.
    const timeFromNow = Math.floor((expiration.getTime() - (new Date()).getTime()) / 1000)
    if (timeFromNow <= 0) {
      throw new PermanentSwapError(`Expected expiration to be in the future. Seconds from now is: ${timeFromNow}`)
    }

    if (timeFromNow < finalDelta) {
      throw new PermanentSwapError(`Timelock for total swap is shorter than final hop of payment. ` +
        `timeFromNow: ${timeFromNow}, finalDelta: ${finalDelta}`)
    }

    const newEscrow = await api.createEscrow(this.apiKey, hash, recipientId, amount, expiration)
    this.logger.debug(`Escrow for swap (${hash}) created`)
    return newEscrow
  }

  private async waitForEscrowEnd (startedEscrow: api.Escrow): Promise<api.Escrow> {
    let escrow = startedEscrow

    while (escrow.status === api.EscrowStatus.pending && new Date() < escrow.timeout) {
      escrow = await api.getEscrow(this.apiKey, escrow.id)

      if (escrow.status !== api.EscrowStatus.pending) {
        return escrow
      }

      await delay(SUBSCRIBE_ESCROW_DELAY)
    }

    return escrow
  }

  async translateSwap (address: PaymentChannelNetworkAddress, hash: SwapHash, value: string, maxTime: Date, finalDelta = MIN_FINAL_DELTA): Promise<SwapPreimage> {
    const amount = { asset: Asset.USDX, unit: Unit.Cent, value: parseInt(value, 10) }
    const escrow = await this.createEscrowIdempotent(hash, address, amount, maxTime, finalDelta)
    const endedEscrow = await this.waitForEscrowEnd(escrow)

    switch (endedEscrow.status) {
      case (api.EscrowStatus.complete):
        if (!endedEscrow.preimage) {
          throw new Error(`Escrow for swap (${hash}) is complete but has no preimage.`)
        }
        return endedEscrow.preimage
      case (api.EscrowStatus.canceled):
        throw new PermanentSwapError(`Swap with hash (${hash}) is canceled.`)
      default:
        await api.cancelEscrow(this.apiKey, endedEscrow.id)
        throw new PermanentSwapError(`Swap with hash (${hash}) is expired.`)
    }
  }

  async getSettledSwapPreimage (hash: SwapHash): Promise<SwapPreimage> {
    this.logger.debug(`getSettledSwapPreimage ${hash}`)
    throw new Error(`UNIMPLEMENTED`)
  }

  async prepareSwap (hash: SwapHash, amount: string, expiration: Date, timelockDelta: number): Promise<void> {
    const swap = this.incomingSwaps.get(hash)
    if (swap) {
      if (swap.amount !== parseFloat(amount) ||
        swap.timelockDelta !== timelockDelta ||
        swap.expiration.getTime() !== expiration.getTime()) {
        throw new Error(`Swap for ${hash} has previously been prepared, but parameters don't match.`)
      }
      return
    }

    this.incomingSwaps.set(hash, {
      amount: parseFloat(amount),
      timelockDelta,
      expiration
    })
  }

  async cancelSwap (hash: SwapHash): Promise<void> {
    const recipientId = await this.getAccountId()
    const escrow = await api.getEscrowByHash(this.apiKey, hash, undefined, recipientId)
    if (!escrow) throw new Error(`Escrow not found with hash: ${hash}`)
    if (escrow.status === api.EscrowStatus.canceled) {
      this.logger.debug(`Swap has already been canceled ${hash}`)
      return
    }

    try {
      await api.cancelEscrow(this.apiKey, escrow.id)
      this.logger.debug(`Canceled swap with hash (${hash})`)
    } catch (e) {
      const updatedEscrow = await api.getEscrow(this.apiKey, escrow.id)

      if (updatedEscrow.status === api.EscrowStatus.canceled) {
        this.logger.debug(`Swap has already been canceled ${hash}`)
        return
      }
      throw e
    }
  }

  async settleSwap (preimage: SwapPreimage): Promise<void> {
    const hash = generateHash(preimage)
    const recipientId = await this.getAccountId()

    const escrow = await api.getEscrowByHash(this.apiKey, hash, undefined, recipientId)
    if (!escrow) throw new Error(`Escrow not found with hash: ${hash}`)

    try {
      await api.completeEscrow(this.apiKey, escrow.id, preimage)
    } catch (e) {
      const updatedEscrow = await api.getEscrow(this.apiKey, escrow.id)
      if (updatedEscrow.status === api.EscrowStatus.complete) {
        this.logger.debug(`Swap has already been settled: escrow ID ${escrow.id}`)
        return
      }
      throw e
    }
  }

  async initiateSwap (address: string, hash: SwapHash, amount: string, maxTimeLock: number, finalDelta: number): Promise<SwapPreimage> {
    const parameters = JSON.stringify({ address, hash, amount, maxTimeLock, finalDelta })
    this.logger.debug(`initiateSwap ${parameters}`)
    throw new Error('unimplemented')
  }

  async getUncommittedBalance (): Promise<string> {
    return '0'
  }

  async getTotalChannelBalance (): Promise<string> {
    const [
      escrowBalance,
      account
    ] = await Promise.all([
      api.getEscrowBalance(this.apiKey),
      api.getOwnAccount(this.apiKey)
    ])

    const accountBalance = account.balances.find(balance => balance.currency === api.USDX)

    // Anchor will only return a balance if the user has ever held USDX
    const accountBalValue = accountBalance ? Math.round(accountBalance.amount * Number(this.quantumsPerCommon)) : 0

    return (accountBalValue + escrowBalance.value).toString()
  }

  async getTotalPendingChannelBalance (): Promise<string> {
    return '0'
  }

  async getUncommittedPendingBalance (): Promise<string> {
    return '0'
  }

  private async waitForEscrowStart (hash: SwapHash, expiration: Date): Promise<api.Escrow> {
    const accountId = await this.getAccountId()

    do {
      const escrow = await api.getEscrowByHash(this.apiKey, hash, undefined, accountId)
      if (escrow) return escrow
      await delay(SUBSCRIBE_ESCROW_DELAY)
    } while (new Date() < expiration)

    throw new ExpiredSwapError(`Swap with hash (${hash}) is expired.`)
  }

  async getEscrowStatus (hash: SwapHash): Promise<api.EscrowStatus | null> {
    const escrow = await api.getEscrowByHash(this.apiKey, hash)
    return escrow ? escrow.status : null
  }

  async waitForSwapCommitment (hash: SwapHash): Promise<Date> {
    const terms = this.incomingSwaps.get(hash)

    if (!terms) {
      throw new Error(`No swap with hash (${hash}) has been prepared`)
    }

    const escrow = await this.waitForEscrowStart(hash, terms.expiration)
    this.logger.debug(`Swap with hash (${hash}) committed`)

    switch (escrow.status) {
      case (api.EscrowStatus.complete):
        throw new SettledSwapError(`Swap with hash (${hash}) is already settled.`)
      case (api.EscrowStatus.canceled):
        throw new CanceledSwapError(`Swap with hash (${hash}) is canceled.`)
    }

    try {
      assertEscrowTerms(escrow, terms)
    } catch (e) {
      await this.cancelSwap(hash)
      throw e
    }

    return escrow.created
  }

  private async getAccountId (): Promise<string> {
    if (this.accountId != null) {
      return this.accountId
    }

    const account = await api.getOwnAccount(this.apiKey)
    this.accountId = account.id

    return this.accountId
  }
}
