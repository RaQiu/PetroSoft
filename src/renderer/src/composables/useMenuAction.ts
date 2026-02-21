import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'

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
      case 'file.close-workarea':
        workareaStore.closeWorkarea()
        break
      case 'file.exit':
        window.close()
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

      // Data management
      case 'data.data-manage':
        requireWorkarea(() => dialogStore.showDataManage())
        break

      // Data query
      case 'data.query.well':
        requireWorkarea(() => dialogStore.showWellDataQuery())
        break

      // Well menu
      case 'well.manage':
        requireWorkarea(() => dialogStore.showWellList())
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

      // Help menu
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

  return { handleMenuClick }
}
