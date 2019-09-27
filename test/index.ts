import { expect } from './test-helper'
import * as spectron from 'spectron'

describe('Application launch', function () {
  let app: spectron.Application

  beforeEach(function () {
    app = this.app
  })

  it('title says Sparkswap', async () => {
    const title = await app.client.getTitle()
    expect(title).to.be.eql('Sparkswap')
  })

  it('button for `Scan for LND` exists', async () => {
    const buttonExists = await app.client.isExisting('button=Scan for LND')
    expect(buttonExists).to.be.true('Cannot find `Scan LND` button on ui')
  })
})
