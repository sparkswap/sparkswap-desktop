import { App, Menu, MenuItem, MenuItemConstructorOptions } from 'electron'
import { autoUpdater } from 'electron-updater'
import { openLink, IS_MACOS } from './util'
import { IS_DEVELOPMENT, IS_TEST } from '../common/config'

const SPARKSWAP_URL = 'https://sparkswap.com'
const SPARKSWAP_PRIVACY_URL = 'https://sparkswap.com/privacy'
const SPARKSWAP_TERMS_URL = 'https://sparkswap.com/terms'

function createMenu (_app: App): void {
  const file = new MenuItem({ id: '2', role: 'fileMenu' })
  const window = new MenuItem({ id: '3', role: 'windowMenu' })
  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: 'reload' },
    { role: 'forceReload' },
    { role: 'toggleDevTools' },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' }
  ]

  if (!IS_DEVELOPMENT && !IS_TEST) {
    viewSubmenu.splice(viewSubmenu.findIndex(({ role }) => role === 'toggleDevTools'), 1)
  }

  const view = new MenuItem({ id: '4', role: 'viewMenu', submenu: viewSubmenu })

  const helpSubmenu = [
    {
      label: 'Learn More',
      click: () => openLink(SPARKSWAP_URL)
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

  if (!IS_MACOS) {
    helpSubmenu.unshift({
      label: 'Check for updates',
      click: () => autoUpdater.checkForUpdates()
    })
  }

  const help = new MenuItem({
    id: '5',
    role: 'help',
    submenu: helpSubmenu
  })
  const edit = new MenuItem({ id: '4', role: 'editMenu' })

  const menu = new Menu()

  if (IS_MACOS) {
    const name = new MenuItem({
      id: '1',
      role: 'appMenu',
      submenu: [
        { role: 'about' },
        {
          label: 'Check for updates...',
          click: () => autoUpdater.checkForUpdates()
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
    menu.append(name)
  }

  menu.append(file)
  menu.append(edit)
  menu.append(view)
  menu.append(window)
  menu.append(help)

  Menu.setApplicationMenu(menu)
}

export default createMenu
