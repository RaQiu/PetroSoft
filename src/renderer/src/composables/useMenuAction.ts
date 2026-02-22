import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import * as workareaApi from '@/api/workarea'

export function useMenuAction() {
  const dialogStore = useDialogStore()
  const workareaStore = useWorkareaStore()

  function handleMenuClick(menuId: string, label: string) {
    switch (menuId) {
      // File menu
      case 'file.new-workarea':
        dialogStore.showCreateWorkarea()
        break
      case 'file.open-workarea':
        workareaStore.openWorkareaFromDisk()
        break
      case 'file.save-workarea':
        requireWorkarea(() => saveWorkarea())
        break
      case 'file.backup-data':
        requireWorkarea(() => backupData())
        break
      case 'file.close-workarea':
        workareaStore.closeWorkarea()
        break
      case 'file.clear-cache':
        requireWorkarea(() => clearCache())
        break
      case 'file.exit':
        window.close()
        break

      // SEG-Y browse (no workarea required)
      case 'file.segy-browse':
        dialogStore.showSegyBrowse()
        break

      // Data import menu
      case 'data.well-position.import':
        requireWorkarea(() => dialogStore.showImportFile('coordinates'))
        break
      case 'data.well-deviation.import':
        requireWorkarea(() => dialogStore.showImportFile('trajectory'))
        break
      case 'data.curve.import':
        requireWorkarea(() => dialogStore.showImportFile('curves'))
        break
      case 'data.layer.import':
        requireWorkarea(() => dialogStore.showImportFile('layers'))
        break
      case 'data.interpretation.import':
        requireWorkarea(() => dialogStore.showImportFile('interpretation'))
        break
      case 'data.mud-log.import':
        requireWorkarea(() => dialogStore.showImportFile('lithology'))
        break
      case 'data.time-depth.import':
        requireWorkarea(() => dialogStore.showImportFile('time_depth'))
        break
      case 'data.well-attribute.import':
        requireWorkarea(() => dialogStore.showImportFile('well_attribute'))
        break

      // Data export menu
      case 'data.well-position.export':
        requireWorkarea(() => dialogStore.showExportFile('coordinates'))
        break
      case 'data.well-deviation.export':
        requireWorkarea(() => dialogStore.showExportFile('trajectory'))
        break
      case 'data.curve.export':
        requireWorkarea(() => dialogStore.showExportFile('curves'))
        break
      case 'data.layer.export':
        requireWorkarea(() => dialogStore.showExportFile('layers'))
        break
      case 'data.interpretation.export':
        requireWorkarea(() => dialogStore.showExportFile('interpretation'))
        break
      case 'data.mud-log.export':
        requireWorkarea(() => dialogStore.showExportFile('lithology'))
        break
      case 'data.time-depth.export':
        requireWorkarea(() => dialogStore.showExportFile('time_depth'))
        break
      case 'data.well-attribute.export':
        requireWorkarea(() => dialogStore.showExportFile('well_attribute'))
        break

      // Data management
      case 'data.data-manage':
        requireWorkarea(() => dialogStore.showDataManage())
        break

      // Data query
      case 'data.query.well':
        requireWorkarea(() => dialogStore.showWellDataQuery())
        break
      case 'data.query.seismic':
        requireWorkarea(() => dialogStore.showSeismicDisplay())
        break

      // Seismic import
      case 'data.post-seismic.import':
        requireWorkarea(() => dialogStore.showSeismicImport())
        break

      // Seismic display
      case 'seismic.display':
        requireWorkarea(() => dialogStore.showSeismicDisplay())
        break

      // Well menu
      case 'well.manage':
        requireWorkarea(() => dialogStore.showWellList())
        break
      case 'well.curve-edit':
        requireWorkarea(() => dialogStore.showWellCurve())
        break
      case 'well.resample':
        requireWorkarea(() => dialogStore.showResample())
        break
      case 'well.filter':
        requireWorkarea(() => dialogStore.showFilter())
        break
      case 'well.calculator':
        requireWorkarea(() => dialogStore.showCurveCalculator())
        break
      case 'well.calc-impedance':
        requireWorkarea(() =>
          dialogStore.showCurveCalculator({
            expression: 'DEN * (1000000 / DT)',
            resultName: 'IMP',
            resultUnit: 'g/cc·m/s'
          })
        )
        break
      case 'well.standardize.zscore':
        requireWorkarea(() => dialogStore.showStandardize('zscore'))
        break
      case 'well.standardize.minmax':
        requireWorkarea(() => dialogStore.showStandardize('minmax'))
        break
      case 'well.normalize':
        requireWorkarea(() => dialogStore.showStandardize('normalize'))
        break
      case 'well.outlier':
        requireWorkarea(() => dialogStore.showOutlier())
        break
      case 'well.baseline':
        requireWorkarea(() => dialogStore.showBaseline())
        break

      // Velocity menu
      case 'velocity.synthetic':
        ElMessage.info('合成记录功能开发中...')
        break
      case 'velocity.quick-calibration':
        requireWorkarea(() => dialogStore.showQuickCalibration())
        break
      case 'velocity.modeling.constraint':
        requireWorkarea(() => dialogStore.showVelocityModeling())
        break
      case 'velocity.conversion':
        requireWorkarea(() => dialogStore.showVelocityConversion())
        break
      case 'velocity.td-convert.volume':
        requireWorkarea(() => dialogStore.showTDConvertVolume())
        break
      case 'velocity.td-convert.horizon':
        requireWorkarea(() => dialogStore.showTDConvertHorizon())
        break
      case 'velocity.td-convert.fault':
        requireWorkarea(() => dialogStore.showTDConvertFault())
        break

      // Window menu
      case 'window.close-all':
        dialogStore.closeAllDialogs()
        break

      // Rock physics menu — sensitivity analysis
      case 'rock-physics.sensitivity.histogram':
        requireWorkarea(() => dialogStore.showHistogram())
        break
      case 'rock-physics.sensitivity.crossplot':
        requireWorkarea(() => dialogStore.showCrossplot())
        break

      // Rock physics menu — reservoir parameters
      case 'rock-physics.reservoir.vsh':
        requireWorkarea(() => dialogStore.showVshCalc())
        break
      case 'rock-physics.reservoir.porosity':
        requireWorkarea(() => dialogStore.showPorosityCalc())
        break
      case 'rock-physics.reservoir.total-porosity':
        requireWorkarea(() => dialogStore.showTotalPorosity())
        break
      case 'rock-physics.reservoir.permeability':
        requireWorkarea(() => dialogStore.showReservoirParams('permeability'))
        break
      case 'rock-physics.reservoir.saturation':
        requireWorkarea(() => dialogStore.showReservoirParams('saturation'))
        break

      // Rock physics menu — advanced
      case 'rock-physics.predict-vs':
        requireWorkarea(() => dialogStore.showSWavePredict())
        break
      case 'rock-physics.elastic-params':
        requireWorkarea(() => dialogStore.showElasticCalc())
        break
      case 'rock-physics.fluid-sub':
      case 'rock-physics.fluid-sub.gassmann':
        requireWorkarea(() => dialogStore.showFluidSub())
        break

      // Rock physics menu — new dialogs
      case 'rock-physics.curve-correction.vp':
        requireWorkarea(() => dialogStore.showVpCorrection())
        break
      case 'rock-physics.curve-correction.density':
        requireWorkarea(() => dialogStore.showDensityCorrection())
        break
      case 'rock-physics.curve-reconstruct':
        requireWorkarea(() => dialogStore.showCurveReconstruct())
        break
      case 'rock-physics.elastic-impedance':
        requireWorkarea(() => dialogStore.showElasticImpedance())
        break
      case 'rock-physics.fluid-sub.adaptive':
        requireWorkarea(() => dialogStore.showAdaptiveModel())
        break
      case 'rock-physics.fluid-sub.sand-shale':
        requireWorkarea(() => dialogStore.showSandShaleModel())
        break
      case 'rock-physics.fluid-sub.simplified':
        requireWorkarea(() => dialogStore.showFluidSubSimplified())
        break

      // Smart interpretation menu — seismic views
      case 'smart-interp.inline':
      case 'smart-interp.crossline':
        requireWorkarea(() => dialogStore.showSeismicDisplay())
        break

      // Smart interpretation menu — horizon operations
      case 'smart-interp.horizon-from-tops':
        requireWorkarea(() => dialogStore.showHorizonFromTops())
        break
      case 'smart-interp.horizon-smooth':
        requireWorkarea(() => dialogStore.showHorizonSmooth())
        break
      case 'smart-interp.horizon-calc':
        requireWorkarea(() => dialogStore.showHorizonCalc())
        break
      case 'smart-interp.horizon-interpolate':
        requireWorkarea(() => dialogStore.showHorizonInterpolate())
        break
      case 'smart-interp.horizon-merge':
        requireWorkarea(() => dialogStore.showHorizonMerge())
        break
      case 'smart-interp.horizon-decimate':
        requireWorkarea(() => dialogStore.showHorizonDecimate())
        break

      // Help menu
      case 'help.manual':
        ElMessage.info('用户手册编写中...')
        break
      case 'help.about':
        dialogStore.showAbout()
        break

      default:
        // Handle recent workarea clicks
        if (menuId.startsWith('file.recent.')) {
          const path = menuId.replace('file.recent.', '')
          if (path && path !== 'empty') {
            workareaStore.openWorkareaFromPath(path)
          }
          break
        }
        ElMessage.info(`「${label}」功能开发中...`)
    }
  }

  function requireWorkarea(action: () => void) {
    if (!workareaStore.isOpen) {
      ElMessage.warning('请先打开或创建工区')
      return
    }
    action()
  }

  async function saveWorkarea() {
    try {
      await workareaApi.saveWorkarea(workareaStore.path)
      ElMessage.success('工区已保存')
    } catch {
      ElMessage.error('保存失败')
    }
  }

  async function backupData() {
    const result = await window.api.saveFile(`${workareaStore.name}_backup.db`)
    if (result.canceled || !result.filePath) return
    try {
      await workareaApi.backupWorkarea(workareaStore.path, result.filePath)
      ElMessage.success('备份成功')
    } catch {
      ElMessage.error('备份失败')
    }
  }

  async function clearCache() {
    try {
      await workareaApi.clearCache(workareaStore.path)
      ElMessage.success('缓存已清除')
    } catch {
      ElMessage.error('清除缓存失败')
    }
  }

  return { handleMenuClick }
}
