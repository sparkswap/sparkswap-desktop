import path from 'path'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import * as spectron from 'spectron'

chai.use(dirtyChai)
chai.use(chaiAsPromised)

beforeEach(function () {
  process.env.NODE_ENV = 'test'
  process.env.NODE_PRESERVE_SYMLINKS = '1'

  let electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron')

  if (process.platform === 'win32') {
    electronPath += '.cmd'
  }

  const appPath = path.join(__dirname, '..', 'src', 'node', 'ts-node.js')

  this.app = new spectron.Application({
    path: electronPath,
    args: [appPath]
  })
})

beforeEach(async function () {
  await this.app.start()
})

afterEach(async function () {
  await this.app.stop()

  process.env.NODE_PRESERVE_SYMLINKS = undefined
  process.env.NODE_ENV = undefined
})

export const { expect } = chai
