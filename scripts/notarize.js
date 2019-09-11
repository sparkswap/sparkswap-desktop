const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
// eslint-disable-next-line
const { notarize } = require('electron-notarize')

const APPLE_ID = process.env.APPLE_ID
const APPLE_ID_PASS = process.env.APPLE_ID_PASS

function getAppId () {
  try {
    const yamlPath = path.join(__dirname, '..', 'electron-builder.yml')
    const { appId } = yaml.safeLoad(fs.readFileSync(yamlPath).toString(), { json: true })
    return appId
  } catch (e) {
    console.error('Unable to load application id ')
    throw e
  }
}

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context

  if (electronPlatformName !== 'darwin') {
    console.log(getAppId())
    return
  }

  const appName = context.packager.appInfo.productFilename

  console.log('Starting to notarize macOS application')

  await notarize({
    appBundleId: getAppId(),
    appPath: `${appOutDir}/${appName}.app`,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_ID_PASS
  })

  console.log('Finished notarizing macOS application')
}
