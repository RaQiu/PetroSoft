import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  openDirectory(): Promise<Electron.OpenDialogReturnValue>
  openFile(filters?: Electron.FileFilter[]): Promise<Electron.OpenDialogReturnValue>
  saveFile(defaultPath?: string): Promise<Electron.SaveDialogReturnValue>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
