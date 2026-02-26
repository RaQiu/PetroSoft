import { ipcMain, dialog, BrowserWindow } from 'electron'
import {
  openChildWindow,
  closeChildWindow,
  closeAllChildWindows,
  getOpenWindowStates
} from './windowManager'

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { canceled: true, filePaths: [] }
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    return result
  })

  ipcMain.handle('dialog:openFile', async (_event, filters?: Electron.FileFilter[]) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { canceled: true, filePaths: [] }
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    })
    return result
  })

  ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { canceled: true, filePath: '' }
    const result = await dialog.showSaveDialog(window, {
      defaultPath
    })
    return result
  })

  // Child window management
  ipcMain.handle(
    'window:open',
    async (
      _event,
      args: {
        id: string
        workarea: string
        preset?: string
        size?: { width: number; height: number }
        pos?: { x: number; y: number }
      }
    ) => {
      openChildWindow(args.id, args.workarea, args.preset, args.size, args.pos)
    }
  )

  ipcMain.handle('window:close', async (_event, windowId: string) => {
    closeChildWindow(windowId)
  })

  ipcMain.handle('window:close-all', async () => {
    closeAllChildWindows()
  })

  ipcMain.handle('window:get-states', async () => {
    return getOpenWindowStates()
  })
}
