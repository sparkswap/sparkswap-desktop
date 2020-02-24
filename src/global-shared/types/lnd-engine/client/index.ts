import { LndRouter } from './router'
import { LndInvoices, Invoice } from './invoices'
import { LndEngineClient } from 'lnd-engine'
import { GrpcCall, GrpcOptions, GrpcError } from './grpc'
import { LoggerInterface } from '../../../logger'

export interface UTXO {
  amountSat: string,
  address: string
}

export enum AddressType {
  WITNESS_PUBKEY_HASH = 0,
  NESTED_PUBKEY_HASH = 1
}

interface ListUnspentRequest {
  minConfs: number,
  maxConfs: number
}

interface ListUnspentResponse {
  utxos: UTXO[]
}

export interface AddrToAmount {
  [index: string]: string
}

interface SendManyRequest {
  AddrToAmount: AddrToAmount,
  satPerByte?: string
}

interface SendManyResponse {
  txid: string
}

interface NewAddressResponse {
  address: string,
  type?: AddressType
}

interface EstimateFeeRequest {
  AddrToAmount: AddrToAmount,
  targetConf?: number
}

interface EstimateFeeResposne {
  feeSat: string,
  feerateSatPerByte: string
}

export interface LndActionOptions {
  client: LndEngineClient,
  logger: LoggerInterface
}

interface LightningAddress {
  pubkey: string,
  host?: string
}

interface ConnectPeerRequest {
  addr: LightningAddress
}

interface OpenChannelRequest {
  nodePubkey: string, // base64
  localFundingAmount: number,
  targetConf: number,
  private: boolean
}

interface PendingUpdate {
  txid: string, // base64
  outputIndex: number
}

interface ChannelPointStr {
  fundingTxidStr: string, // hex
  outputIndex: number
}

interface ChannelPointBytes {
  fundingTxidBytes: string, // base64
  outputIndex: number
}

type ChannelPoint = ChannelPointStr | ChannelPointBytes

interface ChannelOpenUpdate {
  channelPoint: ChannelPoint
}

export interface PendingOpenResponse {
  chanPending: PendingUpdate
}

export interface ChannelOpenResponse {
  chanOpen: ChannelOpenUpdate
}

export type OpenChannelResponse = PendingOpenResponse | ChannelOpenResponse

interface CloseChannelRequest {
  channelPoint: ChannelPoint,
  force: boolean
}

interface ChannelCloseUpdate {
  closingTxid: string, // base64
  success: boolean
}

export interface ChannelCloseResponse {
  chanClose: ChannelCloseUpdate
}

export interface PendingCloseResponse {
  closePending: PendingUpdate
}

export type CloseChannelResponse = PendingCloseResponse | ChannelCloseResponse

interface SignMessageRequest {
  msg: string // base64
}

interface SignMessageResponse {
  signature: string
}

interface WalletBalanceResponse {
  totalBalance: string, // int64
  confirmedBalance: string, // int64
  unconfirmedBalance: string // int64
}

interface ListChannelsRequest {
  activeOnly?: boolean,
  inactiveOnly?: boolean,
  publicOnly?: boolean,
  privateOnly?: boolean
}

// At the moment, this data structure is only defined for the `listChannels` rpc
interface LndChannelHtlc {
  incoming: boolean,
  amount: string, // int64
  hashLock: string, // bytes
  expirationHeight: number
}

export interface LndChannel {
  active: boolean,
  remotePubkey: string,
  channelPoint: string,
  chanId: string, // uint64
  capacity: string, // int64
  localBalance: string, // int64
  remoteBalance: string, // int64
  commitFee: string, // int64
  commitWeight: string, // int64
  feePerKw: string, // int64
  unsettledBalance: string, // int64
  totalSatoshisSent: string, // int64
  totalSatoshisReceived: string, // int64
  numUpdates: string, // uint64
  pendingHtlcs: LndChannelHtlc[],
  csvDelay: number,
  private: boolean,
  intiator: boolean,
  chanStatusFlags: string
}

interface ListChannelsResponse {
  channels: LndChannel[]
}

export interface LndPendingChannel {
  remoteNodePub: string,
  channelPoint: string,
  capacity: string, // int64
  localBalance: string, // int64
  remoteBalance: string // int64
}

export interface PendingChannelWrapper {
  channel: LndPendingChannel,
  closingTxid?: string
}

interface PendingChannelsResponse {
  pendingOpenChannels: PendingChannelWrapper[],
  pendingClosingChannels: PendingChannelWrapper[],
  pendingForceClosingChannels: PendingChannelWrapper[],
  waitingCloseChannels: PendingChannelWrapper[],
  totalLimboBalance: string // int64
}

interface NodeInfoRequest {
  pubKey: string
}

// More data is available, see: https://api.lightning.community/#lightningnode
interface LightningNode {
  lastUpdate: number,
  pubKey: string,
  alias: string,
  color: string
}

// More data is available, see: https://api.lightning.community/#getnodeinfo
interface NodeInfoResponse {
  node: LightningNode,
  numChannels: number,
  totalCapacity: string // int64
}

interface ListInvoicesRequest {
  pendingOnly: boolean,
  indexOffset: string, // uint64
  numMaxInvoices: string // uint64
}

interface ListInvoicesResponse {
  invoices: Invoice[],
  lastIndexOffset: string // uint64
}

export enum PaymentStatus {
  UNKNOWN = 'UNKNOWN',
  IN_FLIGHT = 'IN_FLIGHT',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED'
}

export interface Payment {
  paymentHash: string,
  valueSat: string, // int64
  status: PaymentStatus,
  // `creationDate` is deprecated in favor of `creationTimeNs` in lnd v0.9.0-beta
  creationDate: string, // int64
  feeSat: string // int64
}

interface ListPaymentsRequest {
  includeIncomplete: boolean
}

interface ListPaymentsResponse {
  payments: Payment[]
}

export interface ChainTransaction {
  txHash: string,
  timeStamp: string, // int64
  amount: string, // int64
  totalFees: string, // int64
  numConfirmations: number, // int32
  rawTxHex: string
}

interface GetTransactionsResponse {
  transactions: ChainTransaction[]
}

interface ClosedChannelsRequest {
  cooperative: boolean,
  localForce: boolean,
  remoteForce: boolean,
  breach: boolean,
  fundingCanceled: boolean,
  abandoned: boolean
}

interface ChannelCloseSummary {
  channelPoint: string,
  closingTxHash: string
}

interface ClosedChannelsResponse {
  channels: ChannelCloseSummary[]
}

export interface Client {
  router: LndRouter,
  invoices: LndInvoices,
  listUnspent: (req: ListUnspentRequest, opts: GrpcOptions, cb: (err: GrpcError, res: ListUnspentResponse) => void) => void,
  sendMany: (req: SendManyRequest, opts: GrpcOptions, cb: (err: GrpcError, res: SendManyResponse) => void) => void,
  newAddress: (req: {}, opts: GrpcOptions, cb: (err: GrpcError, res: NewAddressResponse) => void) => void,
  estimateFee: (req: EstimateFeeRequest, opts: GrpcOptions, cb: (err: GrpcError, res: EstimateFeeResposne) => void) => void,
  connectPeer: (req: ConnectPeerRequest, opts: GrpcOptions, cb: (err: GrpcError, res: {}) => void) => void,
  openChannel: (req: OpenChannelRequest) => GrpcCall<OpenChannelResponse>,
  closeChannel: (req: CloseChannelRequest) => GrpcCall<CloseChannelResponse>,
  signMessage: (req: SignMessageRequest, opts: GrpcOptions, cb: (err: GrpcError, res: SignMessageResponse) => void) => void,
  walletBalance: (req: {}, opts: GrpcOptions, cb: (err: GrpcError, res: WalletBalanceResponse) => void) => void,
  listChannels: (req: ListChannelsRequest, opts: GrpcOptions, cb: (err: GrpcError, res: ListChannelsResponse) => void) => void,
  pendingChannels: (req: {}, opts: GrpcOptions, cb: (err: GrpcError, res: PendingChannelsResponse) => void) => void,
  getNodeInfo: (req: NodeInfoRequest, opts: GrpcOptions, cb: (err: GrpcError, res: NodeInfoResponse) => void) => void,
  listInvoices: (req: ListInvoicesRequest, opts: GrpcOptions, cb: (err: GrpcError, res: ListInvoicesResponse) => void) => void,
  listPayments: (req: ListPaymentsRequest, opts: GrpcOptions, cb: (err: GrpcError, res: ListPaymentsResponse) => void) => void,
  getTransactions: (req: {}, opts: GrpcOptions, cb: (err: GrpcError, res: GetTransactionsResponse) => void) => void,
  closedChannels: (req: ClosedChannelsRequest, opts: GrpcOptions, cb: (err: GrpcError, res: ClosedChannelsResponse) => void) => void
}
