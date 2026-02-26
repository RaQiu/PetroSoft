import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as workareaApi from '@/api/workarea'
import * as windowStateApi from '@/api/windowState'
import type { RecentWorkarea } from '@/api/workarea'
import { useWellStore } from './well'
import { useDialogStore } from './dialog'
import { CHILD_WINDOWS } from '@/config/windowConfig'

// Detect if we're running inside a child window
const isChildWindow = new URLSearchParams(window.location.search).has('childWindow')

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

      // Restore previously open child windows (main window only)
      if (!isChildWindow) {
        try {
          const saved = await windowStateApi.getOpenWindows(res.path)
          for (const w of saved) {
            const def = CHILD_WINDOWS[w.window_id]
            if (!def) continue
            window.api.openChildWindow(
              w.window_id,
              res.path,
              w.preset_data && w.preset_data !== '{}' ? w.preset_data : undefined,
              w.width && w.height ? { width: w.width, height: w.height } : undefined,
              w.pos_x != null && w.pos_y != null ? { x: w.pos_x, y: w.pos_y } : undefined
            )
          }
        } catch {
          // ignore restore errors — not critical
        }
      }
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

  async function closeWorkarea() {
    // Save child window states before closing (main window only)
    if (!isChildWindow && path.value) {
      try {
        const states = await window.api.getChildWindowStates?.()
        if (states?.length) {
          await windowStateApi.saveWindowStates(
            path.value,
            states.map((s) => ({
              window_id: s.windowId,
              title: CHILD_WINDOWS[s.windowId]?.title || s.windowId,
              pos_x: s.posX,
              pos_y: s.posY,
              width: s.width,
              height: s.height,
              preset_data: s.presetData || '{}'
            }))
          )
        } else {
          await windowStateApi.clearWindowStates(path.value)
        }
      } catch {
        // ignore save errors
      }
      window.api.closeAllChildWindows?.()
    }

    const dialogStore = useDialogStore()
    dialogStore.closeAllDialogs()

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
