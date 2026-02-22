import apiClient from './client'

export interface ChartInfo {
  id: number
  name: string
  chart_type: string
  created_at: string
}

export interface ChartDetail extends ChartInfo {
  thumbnail: string
  config: string
}

export async function listCharts(workarea: string, chartType = ''): Promise<ChartInfo[]> {
  const res = await apiClient.get('/chart/list', {
    params: { workarea, chart_type: chartType }
  })
  return res.data.charts
}

export async function getChart(workarea: string, chartId: number): Promise<ChartDetail> {
  const res = await apiClient.get(`/chart/${chartId}`, { params: { workarea } })
  return res.data
}

export async function saveChart(
  workarea: string,
  name: string,
  chartType: string,
  thumbnail: string,
  config: string
): Promise<{ id: number }> {
  const res = await apiClient.post('/chart/save', {
    workarea_path: workarea,
    name,
    chart_type: chartType,
    thumbnail,
    config
  })
  return res.data
}

export async function renameChart(
  workarea: string,
  chartId: number,
  name: string
): Promise<void> {
  await apiClient.put(`/chart/${chartId}`, {
    workarea_path: workarea,
    name
  })
}

export async function deleteChart(workarea: string, chartId: number): Promise<void> {
  await apiClient.delete(`/chart/${chartId}`, { params: { workarea } })
}
