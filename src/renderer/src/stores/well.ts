import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listWells } from '@/api/well'
import type { WellInfo } from '@/types/well'

export const useWellStore = defineStore('well', () => {
  const wells = ref<WellInfo[]>([])
  const selectedWell = ref<WellInfo | null>(null)
  const loading = ref(false)

  async function fetchWells(workareaPath: string) {
    loading.value = true
    try {
      wells.value = await listWells(workareaPath)
    } catch {
      wells.value = []
    } finally {
      loading.value = false
    }
  }

  function selectWell(well: WellInfo) {
    selectedWell.value = well
  }

  function clearWells() {
    wells.value = []
    selectedWell.value = null
  }

  return { wells, selectedWell, loading, fetchWells, selectWell, clearWells }
})
