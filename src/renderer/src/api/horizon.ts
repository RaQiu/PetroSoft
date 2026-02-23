import apiClient from './client'

export interface HorizonInfo {
  id: number
  name: string
  domain: string
  created_at: string
  point_count: number
}

export async function listHorizons(workareaPath: string): Promise<HorizonInfo[]> {
  const res = await apiClient.get('/horizons/list', { params: { workarea: workareaPath } })
  return res.data.horizons
}

export async function listFormations(workareaPath: string): Promise<string[]> {
  const res = await apiClient.get('/horizons/formations', { params: { workarea: workareaPath } })
  return res.data.formations
}

export interface HorizonFromWellTopsParams {
  workarea_path: string
  formation: string
  horizon_name: string
  domain?: string
}

export async function createHorizonFromWellTops(params: HorizonFromWellTopsParams) {
  const res = await apiClient.post('/horizons/from-well-tops', params)
  return res.data
}

export interface HorizonSmoothParams {
  workarea_path: string
  horizon_name: string
  method?: string
  window_size?: number
  result_name?: string
}

export async function smoothHorizon(params: HorizonSmoothParams) {
  const res = await apiClient.post('/horizons/smooth', params)
  return res.data
}

export interface HorizonCalcParams {
  workarea_path: string
  horizon_a: string
  horizon_b?: string
  operation: string
  constant?: number
  result_name?: string
}

export async function calculateHorizon(params: HorizonCalcParams) {
  const res = await apiClient.post('/horizons/calculate', params)
  return res.data
}

export interface HorizonInterpolateParams {
  workarea_path: string
  horizon_name: string
  method?: string
  result_name?: string
}

export async function interpolateHorizon(params: HorizonInterpolateParams) {
  const res = await apiClient.post('/horizons/interpolate', params)
  return res.data
}

export interface HorizonMergeParams {
  workarea_path: string
  horizons: string[]
  strategy?: string
  result_name?: string
}

export async function mergeHorizons(params: HorizonMergeParams) {
  const res = await apiClient.post('/horizons/merge', params)
  return res.data
}

export interface HorizonDecimateParams {
  workarea_path: string
  horizon_name: string
  factor?: number
  result_name?: string
}

export async function decimateHorizon(params: HorizonDecimateParams) {
  const res = await apiClient.post('/horizons/decimate', params)
  return res.data
}

export async function deleteHorizon(name: string, workareaPath: string) {
  const res = await apiClient.delete(`/horizons/${encodeURIComponent(name)}`, { params: { workarea: workareaPath } })
  return res.data
}
