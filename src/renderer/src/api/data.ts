import apiClient from './client'

export interface ImportParams {
  file_path: string
  data_type: string
  workarea_path: string
  well_name?: string
}

export async function importData(params: ImportParams): Promise<{ message: string }> {
  const res = await apiClient.post('/data/import', params)
  return res.data
}

export async function detectImportWellName(params: {
  file_path: string
  data_type: string
}): Promise<{ well_name: string }> {
  const res = await apiClient.post('/data/detect-well-name', params)
  return res.data
}

export async function detectImportFile(params: {
  file_path: string
}): Promise<{
  kind: 'data' | 'image' | 'unknown'
  data_type: string
  display_name: string
  well_name: string
}> {
  const res = await apiClient.post('/data/detect-import-file', params)
  return res.data
}
