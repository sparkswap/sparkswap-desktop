/**
 * The amount of time, in seconds, that we will use in forwarding
 * this transaction. LND's default value announced on its channels is 24 hours
 * (144 Bitcoin blocks)
 *
 * @todo Make this amount dynamic
 */
export const FWD_DELTA = 86400

/**
 * The amount of time, in seconds, that the Server expects to
 * receive when settling a swap. BOLT-11 states the default as 90 minutes (9 Bitcoin
 * blocks).
 *
 * @see {@link https://github.com/lightningnetwork/lightning-rfc/blob/master/11-payment-encoding.md}
 * @todo Make this amount dynamic and set by the Server
 */
export const MIN_FINAL_DELTA = 5400

/**
 * The amount of time, in seconds, that we'd like to buffer any output timelock
 * by to account for block ticks during a swap This is especially problematic on
 * regtest where we mine blocks every 10 seconds and is a known issue on
 * mainnet.
 *
 * @see {@link https://github.com/lightningnetwork/lnd/issues/535}
 */
const BLOCK_BUFFER = 1200

/**
 * The minimum time lock (in seconds) on extended HTLCs in order for them to be
 * accepted. This assumes a static route from this node to the Server.
 *
 * @todo Make this value dynamic to accept different routes
 * and different forwarding policies / final cltv deltas
 */
export const OUTBOUND_TIME_LOCK = MIN_FINAL_DELTA + BLOCK_BUFFER

/**
 * The minimum time lock (in seconds) on inbound HTLCs for us to accept them and
 * be able to forward them on.
 *
 * @todo Make this value dynamic to accept different routes
 * and different forwarding policies / final cltv deltas
 */
export const INBOUND_TIME_LOCK = OUTBOUND_TIME_LOCK + FWD_DELTA + BLOCK_BUFFER
