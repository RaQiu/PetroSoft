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

export interface OutlierParams {
  workarea_path: string
  curve_name: string
  method: string
  action: string
  result_curve_name: string
}

export async function removeOutliers(
  wellName: string,
  params: OutlierParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/outlier`, params)
  return res.data
}

export interface BaselineParams {
  workarea_path: string
  curve_name: string
  result_curve_name: string
}

export async function baselineCorrection(
  wellName: string,
  params: BaselineParams
): Promise<{ message: string }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/baseline`, params)
  return res.data
}
