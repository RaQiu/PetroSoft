import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as workareaApi from '@/api/workarea'
import type { RecentWorkarea } from '@/api/workarea'
import { useWellStore } from './well'

export const useWorkareaStore = defineStore('workarea', () => {
  const name = ref('')
  const path = ref('')
  const isOpen = ref(false)
  const lastOpened = ref('')
  const recentWorkareas = ref<RecentWorkarea[]>([])

  async function fetchRecentWorkareas() {
    try {
      recentWorkareas.value = await workareaApi.getRecentWorkareas()
    } catch {
      recentWorkareas.value = []
    }
  }

  function openWorkarea(workareaName: string, workareaPath: string) {
    name.value = workareaName
    path.value = workareaPath
    isOpen.value = true
    lastOpened.value = new Date().toISOString()
  }

  async function createWorkareaAndOpen(workareaName: string, parentPath: string) {
    try {
      const res = await workareaApi.createWorkarea(workareaName, parentPath)
      openWorkarea(res.name, res.path)
      // Fetch wells for the new workarea
      const wellStore = useWellStore()
      await wellStore.fetchWells(res.path)
      ElMessage.success(`工区 "${workareaName}" 创建成功`)
      fetchRecentWorkareas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '创建失败'
      ElMessage.error(msg)
      throw e
    }
  }

  async function openWorkareaFromPath(workareaPath: string) {
    try {
      const res = await workareaApi.openWorkarea(workareaPath)
      openWorkarea(res.name, res.path)
      const wellStore = useWellStore()
      await wellStore.fetchWells(res.path)
      ElMessage.success(`工区 "${res.name}" 已打开，共 ${res.well_count} 口井`)
      fetchRecentWorkareas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '打开失败'
      ElMessage.error(msg)
      throw e
    }
  }

  async function openWorkareaFromDisk() {
    const result = await window.api.openDirectory()
    if (result.canceled || !result.filePaths.length) return
    await openWorkareaFromPath(result.filePaths[0])
  }

  function closeWorkarea() {
    name.value = ''
    path.value = ''
    isOpen.value = false
    const wellStore = useWellStore()
    wellStore.clearWells()
    ElMessage.info('工区已关闭')
  }

  const displayName = () => {
    return isOpen.value ? name.value : '未打开'
  }

  return {
    name,
    path,
    isOpen,
    lastOpened,
    recentWorkareas,
    openWorkarea,
    createWorkareaAndOpen,
    openWorkareaFromPath,
    openWorkareaFromDisk,
    closeWorkarea,
    fetchRecentWorkareas,
    displayName
  }
})
