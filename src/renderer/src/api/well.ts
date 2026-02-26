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

export async function getDiscreteCurves(
  wellName: string,
  workarea: string
): Promise<CurveDataResponse> {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/discrete-curves`, {
    params: { workarea }
  })
  return res.data.discrete_curves
}

export async function getWellSummary(wellName: string, workarea: string) {
  const res = await apiClient.get(`/well/${encodeURIComponent(wellName)}/summary`, {
    params: { workarea }
  })
  return res.data
}

// ── Well CRUD ──────────────────────────────────────────────────────

export async function updateWell(
  wellName: string,
  workarea: string,
  data: { name?: string; x?: number | null; y?: number | null; kb?: number | null; td?: number | null }
): Promise<void> {
  await apiClient.put(`/well/${encodeURIComponent(wellName)}`, {
    workarea_path: workarea,
    ...data
  })
}

export async function deleteWell(wellName: string, workarea: string): Promise<void> {
  await apiClient.delete(`/well/${encodeURIComponent(wellName)}`, {
    params: { workarea }
  })
}

// ── Curve CRUD ─────────────────────────────────────────────────────

export async function updateCurve(
  wellName: string,
  curveId: number,
  workarea: string,
  data: { name?: string; unit?: string }
): Promise<void> {
  await apiClient.put(`/well/${encodeURIComponent(wellName)}/curves/${curveId}`, {
    workarea_path: workarea,
    ...data
  })
}

export async function deleteCurve(
  wellName: string,
  curveId: number,
  workarea: string
): Promise<void> {
  await apiClient.delete(`/well/${encodeURIComponent(wellName)}/curves/${curveId}`, {
    params: { workarea }
  })
}

// ── Layer CRUD ─────────────────────────────────────────────────────

export async function createLayer(
  wellName: string,
  workarea: string,
  data: { formation: string; top_depth: number; bottom_depth: number }
): Promise<{ id: number }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/layers`, {
    workarea_path: workarea,
    ...data
  })
  return res.data
}

export async function updateLayer(
  wellName: string,
  layerId: number,
  workarea: string,
  data: { formation?: string; top_depth?: number; bottom_depth?: number }
): Promise<void> {
  await apiClient.put(`/well/${encodeURIComponent(wellName)}/layers/${layerId}`, {
    workarea_path: workarea,
    ...data
  })
}

export async function deleteLayer(
  wellName: string,
  layerId: number,
  workarea: string
): Promise<void> {
  await apiClient.delete(`/well/${encodeURIComponent(wellName)}/layers/${layerId}`, {
    params: { workarea }
  })
}

// ── Lithology CRUD ─────────────────────────────────────────────────

export async function createLithology(
  wellName: string,
  workarea: string,
  data: { top_depth: number; bottom_depth: number; description: string }
): Promise<{ id: number }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/lithology`, {
    workarea_path: workarea,
    ...data
  })
  return res.data
}

export async function updateLithology(
  wellName: string,
  entryId: number,
  workarea: string,
  data: { top_depth?: number; bottom_depth?: number; description?: string }
): Promise<void> {
  await apiClient.put(`/well/${encodeURIComponent(wellName)}/lithology/${entryId}`, {
    workarea_path: workarea,
    ...data
  })
}

export async function deleteLithology(
  wellName: string,
  entryId: number,
  workarea: string
): Promise<void> {
  await apiClient.delete(`/well/${encodeURIComponent(wellName)}/lithology/${entryId}`, {
    params: { workarea }
  })
}

// ── Interpretation CRUD ────────────────────────────────────────────

export async function createInterpretation(
  wellName: string,
  workarea: string,
  data: { top_depth: number; bottom_depth: number; conclusion: string; category?: string }
): Promise<{ id: number }> {
  const res = await apiClient.post(`/well/${encodeURIComponent(wellName)}/interpretation`, {
    workarea_path: workarea,
    ...data
  })
  return res.data
}

export async function updateInterpretation(
  wellName: string,
  entryId: number,
  workarea: string,
  data: { top_depth?: number; bottom_depth?: number; conclusion?: string; category?: string }
): Promise<void> {
  await apiClient.put(`/well/${encodeURIComponent(wellName)}/interpretation/${entryId}`, {
    workarea_path: workarea,
    ...data
  })
}

export async function deleteInterpretation(
  wellName: string,
  entryId: number,
  workarea: string
): Promise<void> {
  await apiClient.delete(`/well/${encodeURIComponent(wellName)}/interpretation/${entryId}`, {
    params: { workarea }
  })
}
