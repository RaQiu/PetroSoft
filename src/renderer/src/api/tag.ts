import apiClient from './client'

export interface TagInfo {
  id: number
  name: string
  color: string
  created_at?: string
  well_count?: number
}

export async function listTags(workarea: string): Promise<TagInfo[]> {
  const res = await apiClient.get('/tag/list', { params: { workarea } })
  return res.data.tags
}

export async function createTag(
  workarea: string,
  name: string,
  color: string
): Promise<{ id: number }> {
  const res = await apiClient.post('/tag/create', {
    workarea_path: workarea,
    name,
    color
  })
  return res.data
}

export async function updateTag(
  workarea: string,
  tagId: number,
  name?: string,
  color?: string
): Promise<void> {
  await apiClient.put(`/tag/${tagId}`, {
    workarea_path: workarea,
    name,
    color
  })
}

export async function deleteTag(workarea: string, tagId: number): Promise<void> {
  await apiClient.delete(`/tag/${tagId}`, { params: { workarea } })
}

export async function assignTags(
  workarea: string,
  wellName: string,
  tagIds: number[]
): Promise<void> {
  await apiClient.post('/tag/assign', {
    workarea_path: workarea,
    well_name: wellName,
    tag_ids: tagIds
  })
}

export async function getWellTags(workarea: string, wellName: string): Promise<TagInfo[]> {
  const res = await apiClient.get(`/tag/well-tags/${encodeURIComponent(wellName)}`, {
    params: { workarea }
  })
  return res.data.tags
}
