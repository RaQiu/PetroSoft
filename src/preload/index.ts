import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filters?: Electron.FileFilter[]): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (defaultPath?: string): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath)
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
