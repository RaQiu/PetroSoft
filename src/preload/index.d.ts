import { ElectronAPI } from '@electron-toolkit/preload'

interface ChildWindowState {
  windowId: string
  posX: number | null
  posY: number | null
  width: number
  height: number
  presetData: string
}

interface CustomAPI {
  openDirectory(): Promise<Electron.OpenDialogReturnValue>
  openFile(filters?: Electron.FileFilter[]): Promise<Electron.OpenDialogReturnValue>
  saveFile(defaultPath?: string): Promise<Electron.SaveDialogReturnValue>

  openChildWindow(
    id: string,
    workarea: string,
    preset?: string,
    size?: { width: number; height: number },
    pos?: { x: number; y: number }
  ): Promise<void>
  closeChildWindow(id: string): Promise<void>
  closeAllChildWindows(): Promise<void>
  getChildWindowStates(): Promise<ChildWindowState[]>
  onChildWindowClosed(cb: (id: string) => void): void
  removeChildWindowListeners(): void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
