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
