import apiClient from './client'

export interface WindowState {
  window_id: string
  title?: string
  pos_x?: number | null
  pos_y?: number | null
  width?: number | null
  height?: number | null
  preset_data?: string
}

export async function getOpenWindows(workareaPath: string): Promise<WindowState[]> {
  const res = await apiClient.get('/window-state/list', { params: { workarea: workareaPath } })
  return res.data.windows
}

export async function saveWindowStates(workareaPath: string, windows: WindowState[]): Promise<void> {
  await apiClient.post('/window-state/save', { workarea_path: workareaPath, windows })
}

export async function clearWindowStates(workareaPath: string): Promise<void> {
  await apiClient.delete('/window-state/clear', { params: { workarea: workareaPath } })
}
