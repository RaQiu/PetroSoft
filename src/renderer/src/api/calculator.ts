import apiClient from './client'

export interface CalculateParams {
  workarea_path: string
  expression: string
  result_curve_name: string
  result_unit?: string
}

export async function calculateCurve(
  wellName: string,
  params: CalculateParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/calculate`, params)
  return res.data
}
