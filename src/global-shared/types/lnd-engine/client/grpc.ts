export interface GrpcOptions {
  deadline: number
}

export interface GrpcCall<T> {
  on(event: 'data', listener: (chunk: T) => void): this,
  on(event: 'status', listener: (chunk: unknown) => void): this,
  on(event: 'error', listener: (chunk: GrpcError) => void): this,
  on(event: 'end', listener: () => void): this,
  end (): this,
  removeListener (event: 'data' | 'status' | 'error' | 'end', listener?: Function): void,
  removeAllListeners (): void,
  cancel (): void
}

export interface GrpcError extends Error {
  code: number,
  details?: string
}
