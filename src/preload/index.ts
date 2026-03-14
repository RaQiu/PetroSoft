import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import process from 'node:process'
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

function readImageAsDataUrl(filePath: string): Promise<string> {
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
  return readFile(filePath).then(buffer => `data:${mime};base64,${buffer.toString('base64')}`)
}

const api = {
  openDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filters?: Electron.FileFilter[]): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (defaultPath?: string): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath),
  readImageAsDataUrl,

  // Child window management
  openChildWindow: (
    id: string,
    workarea: string,
    preset?: string,
    size?: { width: number, height: number },
    pos?: { x: number, y: number },
  ): Promise<void> => ipcRenderer.invoke('window:open', { id, workarea, preset, size, pos }),
  closeChildWindow: (id: string): Promise<void> => ipcRenderer.invoke('window:close', id),
  closeAllChildWindows: (): Promise<void> => ipcRenderer.invoke('window:close-all'),
  getChildWindowStates: (): Promise<
    Array<{
      windowId: string
      posX: number | null
      posY: number | null
      width: number
      height: number
      presetData: string
    }>
  > => ipcRenderer.invoke('window:get-states'),
  onChildWindowClosed: (cb: (id: string) => void): void => {
    ipcRenderer.on('window:child-closed', (_, id) => cb(id))
  },
  removeChildWindowListeners: (): void => {
    ipcRenderer.removeAllListeners('window:child-closed')
  },

  // Backend
  getBackendPort: (): Promise<number> => ipcRenderer.invoke('backend:port'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  }
  catch (error) {
    console.error(error)
  }
}
else {
  // @ts-expect-error preload bridge injects electron on the window in non-isolated mode
  window.electron = electronAPI
  // @ts-expect-error preload bridge injects api on the window in non-isolated mode
  window.api = api
}
