import apiClient from './client'
import type {
  SeismicVolumeInfo,
  SegyHeaderInfo,
  SeismicSectionData,
  SurveyOutline
} from '@/types/seismic'

export async function browseSegyHeaders(filePath: string): Promise<SegyHeaderInfo> {
  const res = await apiClient.get('/seismic/segy-headers', {
    params: { file_path: filePath }
  })
  return res.data
}

export async function importSeismic(params: {
  file_path: string
  name: string
  workarea_path: string
}): Promise<{ message: string; metadata: Record<string, number> }> {
  const res = await apiClient.post('/seismic/import', params)
  return res.data
}

export async function listSeismicVolumes(workarea: string): Promise<SeismicVolumeInfo[]> {
  const res = await apiClient.get('/seismic/volumes', { params: { workarea } })
  return res.data.volumes
}

export async function getSeismicSection(
  workarea: string,
  volumeId: number,
  direction: string,
  index: number,
  downsample?: number
): Promise<SeismicSectionData> {
  const res = await apiClient.get('/seismic/section', {
    params: {
      workarea,
      volume_id: volumeId,
      direction,
      index,
      ...(downsample && downsample > 1 ? { downsample } : {})
    },
    timeout: 60000
  })
  return res.data
}

export async function getSurveyOutline(
  workarea: string,
  volumeId: number
): Promise<SurveyOutline> {
  const res = await apiClient.get('/seismic/survey-outline', {
    params: { workarea, volume_id: volumeId }
  })
  return res.data
}
