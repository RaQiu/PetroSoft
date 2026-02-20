import apiClient from './client'
import type { WellInfo, CurveInfo, CurveDataResponse, LayerInfo, LithologyInfo, InterpretationInfo } from '@/types/well'

export async function listWells(workarea: string): Promise<WellInfo[]> {
  const res = await apiClient.get('/well/list', { params: { workarea } })
  return res.data.wells
}

export async function getWellCurves(wellName: string, workarea: string): Promise<CurveInfo[]> {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/curves`, {
    params: { workarea }
  })
  return res.data.curves
}

export async function getCurveData(
  wellName: string,
  workarea: string,
  curves: string[],
  depthMin?: number,
  depthMax?: number
): Promise<CurveDataResponse> {
  const params: Record<string, string | number> = {
    workarea,
    curves: curves.join(',')
  }
  if (depthMin !== undefined) params.depth_min = depthMin
  if (depthMax !== undefined) params.depth_max = depthMax

  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/curve-data`, { params })
  return res.data.data
}

export async function getLayers(wellName: string, workarea: string): Promise<LayerInfo[]> {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/layers`, {
    params: { workarea }
  })
  return res.data.layers
}

export async function getLithology(wellName: string, workarea: string): Promise<LithologyInfo[]> {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/lithology`, {
    params: { workarea }
  })
  return res.data.lithology
}

export async function getInterpretation(
  wellName: string,
  workarea: string
): Promise<InterpretationInfo[]> {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/interpretation`, {
    params: { workarea }
  })
  return res.data.interpretations
}

export async function getWellSummary(wellName: string, workarea: string) {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/summary`, {
    params: { workarea }
  })
  return res.data
}
