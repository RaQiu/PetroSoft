import apiClient from './client'

export interface QueryParams {
  workarea: string
  curves?: string
  depth_min?: number
  depth_max?: number
  page?: number
  page_size?: number
}

export interface QueryResult {
  columns: string[]
  rows: (number | null)[][]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export async function queryWellData(
  wellName: string,
  params: QueryParams
): Promise<QueryResult> {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/query`, { params })
  return res.data
}
