import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDialogStore = defineStore('dialog', () => {
  const createWorkareaVisible = ref(false)
  const importFileVisible = ref(false)
  const dataManageVisible = ref(false)
  const wellListVisible = ref(false)
  const wellCurveVisible = ref(false)
  const exportFileVisible = ref(false)
  const aboutVisible = ref(false)
  const histogramVisible = ref(false)
  const crossplotVisible = ref(false)
  const wellDataQueryVisible = ref(false)
  const resampleVisible = ref(false)
  const filterVisible = ref(false)
  const curveCalculatorVisible = ref(false)

  // Pre-set data type for import/export dialog
  const importPresetType = ref('')
  const exportPresetType = ref('')

  function showCreateWorkarea() {
    createWorkareaVisible.value = true
  }

  function showImportFile(presetType = '') {
    importPresetType.value = presetType
    importFileVisible.value = true
  }

  function showExportFile(presetType = '') {
    exportPresetType.value = presetType
    exportFileVisible.value = true
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

  function showAbout() {
    aboutVisible.value = true
  }

  function showHistogram() {
    histogramVisible.value = true
  }

  function showCrossplot() {
    crossplotVisible.value = true
  }

  function showWellDataQuery() {
    wellDataQueryVisible.value = true
  }

  function showResample() {
    resampleVisible.value = true
  }

  function showFilter() {
    filterVisible.value = true
  }

  function showCurveCalculator() {
    curveCalculatorVisible.value = true
  }

  return {
    createWorkareaVisible,
    importFileVisible,
    dataManageVisible,
    wellListVisible,
    wellCurveVisible,
    exportFileVisible,
    aboutVisible,
    histogramVisible,
    crossplotVisible,
    wellDataQueryVisible,
    resampleVisible,
    filterVisible,
    curveCalculatorVisible,
    importPresetType,
    exportPresetType,
    showCreateWorkarea,
    showImportFile,
    showExportFile,
    showDataManage,
    showWellList,
    showWellCurve,
    showAbout,
    showHistogram,
    showCrossplot,
    showWellDataQuery,
    showResample,
    showFilter,
    showCurveCalculator
  }
})
