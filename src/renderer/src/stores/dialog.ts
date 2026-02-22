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
  const standardizeVisible = ref(false)
  const quickCalibrationVisible = ref(false)
  const velocityModelingVisible = ref(false)
  const velocityConversionVisible = ref(false)
  const tdConvertVolumeVisible = ref(false)
  const tdConvertHorizonVisible = ref(false)
  const tdConvertFaultVisible = ref(false)

  // Pre-set data type for import/export dialog
  const importPresetType = ref('')
  const exportPresetType = ref('')

  // Pre-set for curve calculator (e.g. impedance calculation)
  const curveCalculatorPreset = ref({ expression: '', resultName: '', resultUnit: '' })

  // Pre-set for standardize dialog
  const standardizePresetMethod = ref('')

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

  function showCurveCalculator(preset?: { expression: string; resultName: string; resultUnit: string }) {
    if (preset) {
      curveCalculatorPreset.value = preset
    } else {
      curveCalculatorPreset.value = { expression: '', resultName: '', resultUnit: '' }
    }
    curveCalculatorVisible.value = true
  }

  function showStandardize(method = '') {
    standardizePresetMethod.value = method
    standardizeVisible.value = true
  }

  function showQuickCalibration() {
    quickCalibrationVisible.value = true
  }

  function showVelocityModeling() {
    velocityModelingVisible.value = true
  }

  function showVelocityConversion() {
    velocityConversionVisible.value = true
  }

  function showTDConvertVolume() {
    tdConvertVolumeVisible.value = true
  }

  function showTDConvertHorizon() {
    tdConvertHorizonVisible.value = true
  }

  function showTDConvertFault() {
    tdConvertFaultVisible.value = true
  }

  function closeAllDialogs() {
    createWorkareaVisible.value = false
    importFileVisible.value = false
    dataManageVisible.value = false
    wellListVisible.value = false
    wellCurveVisible.value = false
    exportFileVisible.value = false
    aboutVisible.value = false
    histogramVisible.value = false
    crossplotVisible.value = false
    wellDataQueryVisible.value = false
    resampleVisible.value = false
    filterVisible.value = false
    curveCalculatorVisible.value = false
    standardizeVisible.value = false
    quickCalibrationVisible.value = false
    velocityModelingVisible.value = false
    velocityConversionVisible.value = false
    tdConvertVolumeVisible.value = false
    tdConvertHorizonVisible.value = false
    tdConvertFaultVisible.value = false
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
    standardizeVisible,
    importPresetType,
    exportPresetType,
    curveCalculatorPreset,
    standardizePresetMethod,
    quickCalibrationVisible,
    velocityModelingVisible,
    velocityConversionVisible,
    tdConvertVolumeVisible,
    tdConvertHorizonVisible,
    tdConvertFaultVisible,
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
    showCurveCalculator,
    showStandardize,
    showQuickCalibration,
    showVelocityModeling,
    showVelocityConversion,
    showTDConvertVolume,
    showTDConvertHorizon,
    showTDConvertFault,
    closeAllDialogs
  }
})
