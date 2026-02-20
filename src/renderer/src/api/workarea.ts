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

export async function deleteWorkarea(name: string): Promise<void> {
  await apiClient.delete(`/workarea/${encodeURIComponent(name)}`)
}
