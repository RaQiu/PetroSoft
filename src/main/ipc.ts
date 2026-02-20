import { ipcMain, dialog, BrowserWindow } from 'electron'

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
}
