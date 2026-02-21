import apiClient from './client'

export interface ResampleParams {
  workarea_path: string
  curve_name: string
  new_interval: number
  result_curve_name: string
}

export interface FilterParams {
  workarea_path: string
  curve_name: string
  filter_type: string
  window_size: number
  result_curve_name: string
}

export async function resampleCurve(
  wellName: string,
  params: ResampleParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/resample`, params)
  return res.data
}

export async function filterCurve(
  wellName: string,
  params: FilterParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/filter`, params)
  return res.data
}

export interface StandardizeParams {
  workarea_path: string
  curve_name: string
  method: string
  result_curve_name: string
}

export async function standardizeCurve(
  wellName: string,
  params: StandardizeParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/standardize`, params)
  return res.data
}
