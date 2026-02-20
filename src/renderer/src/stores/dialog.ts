import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDialogStore = defineStore('dialog', () => {
  const createWorkareaVisible = ref(false)
  const importFileVisible = ref(false)
  const dataManageVisible = ref(false)
  const wellListVisible = ref(false)
  const wellCurveVisible = ref(false)

  // Pre-set data type for import dialog
  const importPresetType = ref('')

  function showCreateWorkarea() {
    createWorkareaVisible.value = true
  }

  function showImportFile(presetType = '') {
    importPresetType.value = presetType
    importFileVisible.value = true
  }

  function showDataManage() {
    dataManageVisible.value = true
  }

  function showWellList() {
    wellListVisible.value = true
  }

  function showWellCurve() {
    wellCurveVisible.value = true
  }

  return {
    createWorkareaVisible,
    importFileVisible,
    dataManageVisible,
    wellListVisible,
    wellCurveVisible,
    importPresetType,
    showCreateWorkarea,
    showImportFile,
    showDataManage,
    showWellList,
    showWellCurve
  }
})
