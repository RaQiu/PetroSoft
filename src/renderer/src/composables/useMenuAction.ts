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

      // Data management
      case 'data.data-manage':
        requireWorkarea(() => dialogStore.showDataManage())
        break

      // Well menu
      case 'well.manage':
        requireWorkarea(() => dialogStore.showWellList())
        break

      default:
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
