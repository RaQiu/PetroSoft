import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filters?: Electron.FileFilter[]): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (defaultPath?: string): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // Child window management
  openChildWindow: (
    id: string,
    workarea: string,
    preset?: string,
    size?: { width: number; height: number },
    pos?: { x: number; y: number }
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
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
