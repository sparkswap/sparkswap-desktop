// eslint-disable-next-line
const { notarize } = require('electron-notarize')

const APPLE_ID = process.env.APPLE_ID
const APPLE_ID_PASS = process.env.APPLE_ID_PASS

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context

  if (electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename

  console.log('Starting to notarize macOS application')

  await notarize({
    appBundleId: 'com.sparkswap.Sparkswap',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_ID_PASS
  })

  console.log('Finished notarizing macOS application')
}
