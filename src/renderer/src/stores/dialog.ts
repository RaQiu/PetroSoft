import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWorkareaStore } from './workarea'

// Detect if we're running inside a child window
const isChildWindow = new URLSearchParams(window.location.search).has('childWindow')

export const useDialogStore = defineStore('dialog', () => {
  const createWorkareaVisible = ref(false)
  const importFileVisible = ref(false)
  const dataManageVisible = ref(false)
  const wellListVisible = ref(false)

  const exportFileVisible = ref(false)
  const aboutVisible = ref(false)
  const histogramVisible = ref(false)
  const crossplotVisible = ref(false)
  const wellDataQueryVisible = ref(false)
  const resampleVisible = ref(false)
  const filterVisible = ref(false)
  const curveCalculatorVisible = ref(false)
  const standardizeVisible = ref(false)
  const segyBrowseVisible = ref(false)
  const seismicImportVisible = ref(false)
  const seismicDisplayVisible = ref(false)
  const basemapVisible = ref(false)
  const outlierVisible = ref(false)
  const baselineVisible = ref(false)
  const reservoirParamsVisible = ref(false)
  const vshCalcVisible = ref(false)
  const porosityCalcVisible = ref(false)
  const totalPorosityVisible = ref(false)
  const sWavePredictVisible = ref(false)
  const elasticCalcVisible = ref(false)
  const fluidSubVisible = ref(false)
  const vpCorrectionVisible = ref(false)
  const densityCorrectionVisible = ref(false)
  const curveReconstructVisible = ref(false)
  const adaptiveModelVisible = ref(false)
  const sandShaleModelVisible = ref(false)
  const elasticImpedanceVisible = ref(false)
  const fluidSubSimplifiedVisible = ref(false)
  const quickCalibrationVisible = ref(false)
  const velocityModelingVisible = ref(false)
  const velocityConversionVisible = ref(false)
  const tdConvertVolumeVisible = ref(false)
  const tdConvertHorizonVisible = ref(false)
  const tdConvertFaultVisible = ref(false)
  const horizonFromTopsVisible = ref(false)
  const horizonSmoothVisible = ref(false)
  const horizonCalcVisible = ref(false)
  const horizonInterpolateVisible = ref(false)
  const horizonMergeVisible = ref(false)
  const horizonDecimateVisible = ref(false)
  const compositeLogVisible = ref(false)

  // Pre-set for composite log dialog (open a saved chart)
  const compositeLogChartId = ref(0)

  // Pre-set data type for import/export dialog
  const importPresetType = ref('')
  const exportPresetType = ref('')

  // Pre-set for curve calculator (e.g. impedance calculation)
  const curveCalculatorPreset = ref({ expression: '', resultName: '', resultUnit: '' })

  // Pre-set for standardize dialog
  const standardizePresetMethod = ref('')

  // Pre-set for reservoir params dialog
  const reservoirParamsPresetType = ref('')

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
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('dataManage', workareaStore.path)
      return
    }
    dataManageVisible.value = true
  }

  function showWellList() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('wellList', workareaStore.path)
      return
    }
    wellListVisible.value = true
  }


  function showAbout() {
    aboutVisible.value = true
  }

  function showHistogram() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('histogram', workareaStore.path)
      return
    }
    histogramVisible.value = true
  }

  function showCrossplot() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('crossplot', workareaStore.path)
      return
    }
    crossplotVisible.value = true
  }

  function showWellDataQuery() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('wellDataQuery', workareaStore.path)
      return
    }
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

  function showSegyBrowse() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('segyBrowse', workareaStore.path || '')
      return
    }
    segyBrowseVisible.value = true
  }

  function showSeismicImport() {
    seismicImportVisible.value = true
  }

  function showSeismicDisplay() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('seismicDisplay', workareaStore.path)
      return
    }
    seismicDisplayVisible.value = true
  }

  function showBasemap() {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      window.api.openChildWindow('basemap', workareaStore.path)
      return
    }
    basemapVisible.value = true
  }

  function showOutlier() {
    outlierVisible.value = true
  }

  function showBaseline() {
    baselineVisible.value = true
  }

  function showReservoirParams(presetType = '') {
    reservoirParamsPresetType.value = presetType
    reservoirParamsVisible.value = true
  }

  function showVshCalc() {
    vshCalcVisible.value = true
  }

  function showPorosityCalc() {
    porosityCalcVisible.value = true
  }

  function showTotalPorosity() {
    totalPorosityVisible.value = true
  }

  function showSWavePredict() {
    sWavePredictVisible.value = true
  }

  function showElasticCalc() {
    elasticCalcVisible.value = true
  }

  function showFluidSub() {
    fluidSubVisible.value = true
  }

  function showVpCorrection() {
    vpCorrectionVisible.value = true
  }

  function showDensityCorrection() {
    densityCorrectionVisible.value = true
  }

  function showCurveReconstruct() {
    curveReconstructVisible.value = true
  }

  function showAdaptiveModel() {
    adaptiveModelVisible.value = true
  }

  function showSandShaleModel() {
    sandShaleModelVisible.value = true
  }

  function showElasticImpedance() {
    elasticImpedanceVisible.value = true
  }

  function showFluidSubSimplified() {
    fluidSubSimplifiedVisible.value = true
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

  function showHorizonFromTops() {
    horizonFromTopsVisible.value = true
  }

  function showHorizonSmooth() {
    horizonSmoothVisible.value = true
  }

  function showHorizonCalc() {
    horizonCalcVisible.value = true
  }

  function showHorizonInterpolate() {
    horizonInterpolateVisible.value = true
  }

  function showHorizonMerge() {
    horizonMergeVisible.value = true
  }

  function showHorizonDecimate() {
    horizonDecimateVisible.value = true
  }

  let compositeLogSeq = 0

  function showCompositeLog(chartId = 0) {
    if (!isChildWindow) {
      const workareaStore = useWorkareaStore()
      // Use unique ID so each click opens a new window
      const uniqueId = `compositeLog_${++compositeLogSeq}`
      window.api.openChildWindow(
        uniqueId,
        workareaStore.path,
        chartId ? JSON.stringify({ chartId }) : undefined
      )
      return
    }
    compositeLogChartId.value = chartId
    compositeLogVisible.value = true
  }

  function closeAllDialogs() {
    createWorkareaVisible.value = false
    importFileVisible.value = false
    dataManageVisible.value = false
    wellListVisible.value = false

    exportFileVisible.value = false
    aboutVisible.value = false
    histogramVisible.value = false
    crossplotVisible.value = false
    wellDataQueryVisible.value = false
    resampleVisible.value = false
    filterVisible.value = false
    curveCalculatorVisible.value = false
    standardizeVisible.value = false
    segyBrowseVisible.value = false
    seismicImportVisible.value = false
    seismicDisplayVisible.value = false
    basemapVisible.value = false
    outlierVisible.value = false
    baselineVisible.value = false
    reservoirParamsVisible.value = false
    vshCalcVisible.value = false
    porosityCalcVisible.value = false
    totalPorosityVisible.value = false
    sWavePredictVisible.value = false
    elasticCalcVisible.value = false
    fluidSubVisible.value = false
    vpCorrectionVisible.value = false
    densityCorrectionVisible.value = false
    curveReconstructVisible.value = false
    adaptiveModelVisible.value = false
    sandShaleModelVisible.value = false
    elasticImpedanceVisible.value = false
    fluidSubSimplifiedVisible.value = false
    quickCalibrationVisible.value = false
    velocityModelingVisible.value = false
    velocityConversionVisible.value = false
    tdConvertVolumeVisible.value = false
    tdConvertHorizonVisible.value = false
    tdConvertFaultVisible.value = false
    horizonFromTopsVisible.value = false
    horizonSmoothVisible.value = false
    horizonCalcVisible.value = false
    horizonInterpolateVisible.value = false
    horizonMergeVisible.value = false
    horizonDecimateVisible.value = false
    compositeLogVisible.value = false
    // Close all independent child windows
    if (!isChildWindow) {
      window.api.closeAllChildWindows?.()
    }
  }

  return {
    createWorkareaVisible,
    importFileVisible,
    dataManageVisible,
    wellListVisible,
    exportFileVisible,
    aboutVisible,
    histogramVisible,
    crossplotVisible,
    wellDataQueryVisible,
    resampleVisible,
    filterVisible,
    curveCalculatorVisible,
    standardizeVisible,
    segyBrowseVisible,
    seismicImportVisible,
    seismicDisplayVisible,
    basemapVisible,
    outlierVisible,
    baselineVisible,
    reservoirParamsVisible,
    vshCalcVisible,
    porosityCalcVisible,
    totalPorosityVisible,
    sWavePredictVisible,
    elasticCalcVisible,
    fluidSubVisible,
    vpCorrectionVisible,
    densityCorrectionVisible,
    curveReconstructVisible,
    adaptiveModelVisible,
    sandShaleModelVisible,
    elasticImpedanceVisible,
    fluidSubSimplifiedVisible,
    quickCalibrationVisible,
    velocityModelingVisible,
    velocityConversionVisible,
    tdConvertVolumeVisible,
    tdConvertHorizonVisible,
    tdConvertFaultVisible,
    horizonFromTopsVisible,
    horizonSmoothVisible,
    horizonCalcVisible,
    horizonInterpolateVisible,
    horizonMergeVisible,
    horizonDecimateVisible,
    compositeLogVisible,
    importPresetType,
    exportPresetType,
    curveCalculatorPreset,
    standardizePresetMethod,
    reservoirParamsPresetType,
    compositeLogChartId,
    showCreateWorkarea,
    showImportFile,
    showExportFile,
    showDataManage,
    showWellList,
    showAbout,
    showHistogram,
    showCrossplot,
    showWellDataQuery,
    showResample,
    showFilter,
    showCurveCalculator,
    showStandardize,
    showSegyBrowse,
    showSeismicImport,
    showSeismicDisplay,
    showBasemap,
    showOutlier,
    showBaseline,
    showReservoirParams,
    showVshCalc,
    showPorosityCalc,
    showTotalPorosity,
    showSWavePredict,
    showElasticCalc,
    showFluidSub,
    showVpCorrection,
    showDensityCorrection,
    showCurveReconstruct,
    showAdaptiveModel,
    showSandShaleModel,
    showElasticImpedance,
    showFluidSubSimplified,
    showQuickCalibration,
    showVelocityModeling,
    showVelocityConversion,
    showTDConvertVolume,
    showTDConvertHorizon,
    showTDConvertFault,
    showHorizonFromTops,
    showHorizonSmooth,
    showHorizonCalc,
    showHorizonInterpolate,
    showHorizonMerge,
    showHorizonDecimate,
    showCompositeLog,
    closeAllDialogs
  }
})
