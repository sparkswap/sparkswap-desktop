// eslint-disable-next-line
const path = require('path')

require('ts-node').register({
  // We are using an absolute path instead of relative path to allow this server
  // to be ran from multiple directories
  project: path.join(__dirname, '..', '..', 'tsconfig.node.json')
})
if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line
  require('please-update-dependencies')(module)
}
require('./main.js')
