import apiClient from './client'

export interface ExportParams {
  file_path: string
  data_type: string
  workarea_path: string
  well_name?: string
}

export async function exportData(params: ExportParams): Promise<{ message: string }> {
  const res = await apiClient.post('/data/export', params)
  return res.data
}
