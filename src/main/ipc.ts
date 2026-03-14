import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { getBackendPort } from './pythonBackend'
import {
  closeAllChildWindows,
  closeChildWindow,
  getOpenWindowStates,
  openChildWindow,
} from './windowManager'

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window)
      return { canceled: true, filePaths: [] }
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    })
    return result
  })

  ipcMain.handle('dialog:openFile', async (_event, filters?: Electron.FileFilter[]) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window)
      return { canceled: true, filePaths: [] }
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    })
    return result
  })

  ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window)
      return { canceled: true, filePath: '' }
    const result = await dialog.showSaveDialog(window, {
      defaultPath,
    })
    return result
  })

  ipcMain.handle('file:readImageAsDataUrl', async (_event, filePath: string) => {
    const mimeByExt: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    }
    const ext = extname(filePath).toLowerCase()
    const mime = mimeByExt[ext] || 'application/octet-stream'
    const buffer = await readFile(filePath)
    return `data:${mime};base64,${buffer.toString('base64')}`
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
        size?: { width: number, height: number }
        pos?: { x: number, y: number }
      },
    ) => {
      openChildWindow(args.id, args.workarea, args.preset, args.size, args.pos)
    },
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

  // Backend port (dynamic in production)
  ipcMain.handle('backend:port', () => {
    return getBackendPort()
  })
}
