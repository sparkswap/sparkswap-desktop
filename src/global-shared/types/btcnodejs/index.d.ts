declare module 'btcnodejs' {
  interface BitcoinTransactionInputs {
    txid: string
  }

  interface BitcoinTransaction {
    inputs?: BitcoinTransactionInputs[]
  }

  class BtcNodejs {
    static Transaction: {
      fromHex(rawTxHex: string): BitcoinTransaction
    }
  }

  export default BtcNodejs
}
