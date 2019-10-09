require('ts-node').register({
  project: 'tsconfig.node.json'
})
if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line
  require('please-update-dependencies')(module)
}
require('./main.js')
