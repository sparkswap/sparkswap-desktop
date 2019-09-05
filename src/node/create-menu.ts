import { App, Menu, MenuItem } from 'electron'
import { autoUpdater } from 'electron-updater'
import { openLink, IS_MACOS } from './util'
import { IS_DEVELOPMENT } from '../common/config'

const SPARKSWAP_URL = 'https://sparkswap.com'
const SPARKSWAP_SUPPORT_URL = 'https://support.sparkswap.com'
const SPARKSWAP_PRIVACY_URL = 'https://sparkswap.com/privacy'
const SPARKSWAP_TERMS_URL = 'https://sparkswap.com/terms'

function createMenu (_app: App): void {
  const name = new MenuItem({ id: '1', role: 'appMenu' })
  const file = new MenuItem({ id: '2', role: 'fileMenu' })
  const window = new MenuItem({ id: '3', role: 'windowMenu' })
  const view = new MenuItem({ id: '4', role: 'viewMenu' })
  const help = new MenuItem({
    id: '5',
    role: 'help',
    submenu: [
      {
        label: 'Check for updates',
        click: () => autoUpdater.checkForUpdates()
      },
      {
        label: 'Learn More',
        click: () => openLink(SPARKSWAP_URL)
      },
      {
        label: 'Support',
        click: () => openLink(SPARKSWAP_SUPPORT_URL)
      },
      {
        label: 'Privacy Policy',
        click: () => openLink(SPARKSWAP_PRIVACY_URL)
      },
      {
        label: 'Terms of Service',
        click: () => openLink(SPARKSWAP_TERMS_URL)
      }
    ]
  })

  const menu = new Menu()

  if (IS_MACOS) {
    menu.append(name)
  }

  menu.append(file)

  if (IS_DEVELOPMENT) {
    menu.append(view)
  }

  menu.append(window)
  menu.append(help)

  Menu.setApplicationMenu(menu)
}

export default createMenu
