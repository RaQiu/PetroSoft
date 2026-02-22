import apiClient from './client'

export interface TaskInfo {
  id: number
  task_type: string
  well_name: string
  params: string
  status: string
  result_message: string
  created_at: string
}

export interface TaskListResult {
  total: number
  page: number
  page_size: number
  tasks: TaskInfo[]
}

export async function listTasks(
  workarea: string,
  page = 1,
  pageSize = 50,
  taskType = '',
  status = ''
): Promise<TaskListResult> {
  const res = await apiClient.get('/task/list', {
    params: { workarea, page, page_size: pageSize, task_type: taskType, status }
  })
  return res.data
}

export async function createTask(
  workarea: string,
  taskType: string,
  wellName: string,
  params: string,
  status: string,
  resultMessage: string
): Promise<void> {
  await apiClient.post('/task/create', {
    workarea_path: workarea,
    task_type: taskType,
    well_name: wellName,
    params,
    status,
    result_message: resultMessage
  })
}

export async function deleteTask(workarea: string, taskId: number): Promise<void> {
  await apiClient.delete(`/task/${taskId}`, { params: { workarea } })
}

export async function clearTasks(workarea: string): Promise<void> {
  await apiClient.post('/task/clear', { workarea_path: workarea })
}
