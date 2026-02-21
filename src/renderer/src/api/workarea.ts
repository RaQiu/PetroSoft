import apiClient from './client'

export interface WorkareaInfo {
  name: string
  path: string
}

export interface OpenWorkareaResult {
  name: string
  path: string
  well_count: number
}

export async function createWorkarea(name: string, path: string): Promise<WorkareaInfo> {
  const res = await apiClient.post('/workarea/create', { name, path })
  return res.data
}

export async function listWorkareas(): Promise<WorkareaInfo[]> {
  const res = await apiClient.get('/workarea/list')
  return res.data.workareas
}

export async function openWorkarea(path: string): Promise<OpenWorkareaResult> {
  const res = await apiClient.post('/workarea/open', { path })
  return res.data
}

export async function deleteWorkarea(path: string): Promise<void> {
  await apiClient.delete('/workarea/remove', { params: { path } })
}

export async function saveWorkarea(path: string): Promise<void> {
  await apiClient.post('/workarea/save', { path })
}

export async function backupWorkarea(workareaPath: string, backupPath: string): Promise<void> {
  await apiClient.post('/workarea/backup', {
    workarea_path: workareaPath,
    backup_path: backupPath
  })
}

export async function clearCache(path: string): Promise<void> {
  await apiClient.post('/workarea/clear-cache', { path })
}

export interface RecentWorkarea {
  name: string
  path: string
  last_opened?: string
}

export async function getRecentWorkareas(): Promise<RecentWorkarea[]> {
  const res = await apiClient.get('/workarea/recent')
  return res.data.workareas
}
