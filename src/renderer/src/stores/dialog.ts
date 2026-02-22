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

  function showSegyBrowse() {
    segyBrowseVisible.value = true
  }

  function showSeismicImport() {
    seismicImportVisible.value = true
  }

  function showSeismicDisplay() {
    seismicDisplayVisible.value = true
  }

  function showBasemap() {
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
    importPresetType,
    exportPresetType,
    curveCalculatorPreset,
    standardizePresetMethod,
    reservoirParamsPresetType,
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
    closeAllDialogs
  }
})
