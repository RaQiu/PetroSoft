import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

interface ChildWindowState {
  windowId: string
  posX: number | null
  posY: number | null
  width: number
  height: number
  presetData: string
}

const childWindows = new Map<string, BrowserWindow>()
let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function openChildWindow(
  windowId: string,
  workarea: string,
  preset?: string,
  size?: { width: number; height: number },
  pos?: { x: number; y: number }
): void {
  // If already open, focus instead of creating new
  const existing = childWindows.get(windowId)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return
  }

  const width = size?.width ?? 900
  const height = size?.height ?? 700

  const child = new BrowserWindow({
    width,
    height,
    x: pos?.x,
    y: pos?.y,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Build query string
  const params = new URLSearchParams({ childWindow: windowId, workarea })
  if (preset) {
    params.set('preset', Buffer.from(preset).toString('base64'))
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    child.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?${params.toString()}`)
  } else {
    child.loadFile(join(__dirname, '../renderer/index.html'), {
      search: params.toString()
    })
  }

  child.once('ready-to-show', () => {
    child.show()
  })

  child.on('closed', () => {
    childWindows.delete(windowId)
    // Notify main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:child-closed', windowId)
    }
  })

  childWindows.set(windowId, child)
}

export function closeChildWindow(windowId: string): void {
  const win = childWindows.get(windowId)
  if (win && !win.isDestroyed()) {
    win.close()
  }
}

export function closeAllChildWindows(): void {
  for (const [, win] of childWindows) {
    if (!win.isDestroyed()) {
      win.close()
    }
  }
  childWindows.clear()
}

export function getOpenWindowStates(): ChildWindowState[] {
  const states: ChildWindowState[] = []
  for (const [windowId, win] of childWindows) {
    if (win.isDestroyed()) continue
    const bounds = win.getBounds()
    states.push({
      windowId,
      posX: bounds.x,
      posY: bounds.y,
      width: bounds.width,
      height: bounds.height,
      presetData: '{}'
    })
  }
  return states
}

export function isChildWindow(win: BrowserWindow): boolean {
  for (const child of childWindows.values()) {
    if (child === win) return true
  }
  return false
}
