<template>
  <!-- Child window mode: render only the target dialog component -->
  <div v-if="childWindowId" class="child-window-root">
    <component :is="childComponent" />
  </div>

  <!-- Normal main window mode -->
  <div v-else class="app-container">
    <div v-if="dragOverlayVisible" class="app-drop-overlay">
      <div class="app-drop-card">
        <div class="app-drop-title">
          释放文件开始导入
        </div>
        <div class="app-drop-subtitle">
          数据文件将自动识别类型，图片将进入成果集
        </div>
      </div>
    </div>
    <TitleBar />
    <template v-if="workareaStore.isOpen">
      <MenuBar />
      <ToolBar />
      <MainContent />
      <StatusBar />
    </template>
    <template v-else>
      <WelcomeView @create="onCreateWorkarea" @open="onOpenWorkarea" />
    </template>

    <!-- Dialogs (always mounted so they can be triggered) -->
    <CreateWorkareaDialog />
    <ImportFileDialog />
    <ImportImageDialog />
    <ExportFileDialog />
    <DataManageDialog />
    <WellListDialog />
    <AboutDialog />
    <HistogramDialog />
    <CrossplotDialog />
    <WellDataQueryDialog />
    <ResampleDialog />
    <FilterDialog />
    <CurveCalculatorDialog />
    <StandardizeDialog />
    <SegyBrowseDialog />
    <SeismicImportDialog />
    <SeismicDisplayDialog />
    <BasemapDialog />
    <OutlierDialog />
    <BaselineDialog />
    <ReservoirParamsDialog />
    <VshCalcDialog />
    <PorosityCalcDialog />
    <TotalPorosityDialog />
    <SWavePredictDialog />
    <ElasticCalcDialog />
    <FluidSubDialog />
    <VpCorrectionDialog />
    <DensityCorrectionDialog />
    <CurveReconstructDialog />
    <AdaptiveModelDialog />
    <SandShaleModelDialog />
    <ElasticImpedanceDialog />
    <FluidSubSimplifiedDialog />
    <QuickCalibrationDialog />
    <VelocityModelingDialog />
    <VelocityConversionDialog />
    <TDConvertVolumeDialog />
    <TDConvertHorizonDialog />
    <TDConvertFaultDialog />
    <HorizonFromTopsDialog />
    <HorizonSmoothDialog />
    <HorizonCalcDialog />
    <HorizonInterpolateDialog />
    <HorizonMergeDialog />
    <HorizonDecimateDialog />
    <CompositeLogWindow />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref, watch, defineAsyncComponent, onBeforeUnmount, onMounted, nextTick, type Component } from 'vue'
import { detectImportFile } from '@/api/data'
import { useWorkareaStore } from '@/stores/workarea'
import { useDialogStore } from '@/stores/dialog'
import { useWellStore } from '@/stores/well'
import { DATA_TYPES } from '@/types/well'
import { CHILD_WINDOWS } from '@/config/windowConfig'
import TitleBar from '@/components/layout/TitleBar.vue'
import MenuBar from '@/components/layout/MenuBar.vue'
import ToolBar from '@/components/layout/ToolBar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import WelcomeView from '@/views/WelcomeView.vue'
import CreateWorkareaDialog from '@/components/dialogs/CreateWorkareaDialog.vue'
import ImportFileDialog from '@/components/dialogs/ImportFileDialog.vue'
import ImportImageDialog from '@/components/dialogs/ImportImageDialog.vue'
import ExportFileDialog from '@/components/dialogs/ExportFileDialog.vue'
import DataManageDialog from '@/components/dialogs/DataManageDialog.vue'
import WellListDialog from '@/components/dialogs/WellListDialog.vue'
import AboutDialog from '@/components/dialogs/AboutDialog.vue'
import HistogramDialog from '@/components/dialogs/HistogramDialog.vue'
import CrossplotDialog from '@/components/dialogs/CrossplotDialog.vue'
import WellDataQueryDialog from '@/components/dialogs/WellDataQueryDialog.vue'
import ResampleDialog from '@/components/dialogs/ResampleDialog.vue'
import FilterDialog from '@/components/dialogs/FilterDialog.vue'
import CurveCalculatorDialog from '@/components/dialogs/CurveCalculatorDialog.vue'
import StandardizeDialog from '@/components/dialogs/StandardizeDialog.vue'
import SegyBrowseDialog from '@/components/dialogs/SegyBrowseDialog.vue'
import SeismicImportDialog from '@/components/dialogs/SeismicImportDialog.vue'
import SeismicDisplayDialog from '@/components/dialogs/SeismicDisplayDialog.vue'
import BasemapDialog from '@/components/dialogs/BasemapDialog.vue'
import OutlierDialog from '@/components/dialogs/OutlierDialog.vue'
import BaselineDialog from '@/components/dialogs/BaselineDialog.vue'
import ReservoirParamsDialog from '@/components/dialogs/ReservoirParamsDialog.vue'
import VshCalcDialog from '@/components/dialogs/VshCalcDialog.vue'
import PorosityCalcDialog from '@/components/dialogs/PorosityCalcDialog.vue'
import TotalPorosityDialog from '@/components/dialogs/TotalPorosityDialog.vue'
import SWavePredictDialog from '@/components/dialogs/SWavePredictDialog.vue'
import ElasticCalcDialog from '@/components/dialogs/ElasticCalcDialog.vue'
import FluidSubDialog from '@/components/dialogs/FluidSubDialog.vue'
import VpCorrectionDialog from '@/components/dialogs/VpCorrectionDialog.vue'
import DensityCorrectionDialog from '@/components/dialogs/DensityCorrectionDialog.vue'
import CurveReconstructDialog from '@/components/dialogs/CurveReconstructDialog.vue'
import AdaptiveModelDialog from '@/components/dialogs/AdaptiveModelDialog.vue'
import SandShaleModelDialog from '@/components/dialogs/SandShaleModelDialog.vue'
import ElasticImpedanceDialog from '@/components/dialogs/ElasticImpedanceDialog.vue'
import FluidSubSimplifiedDialog from '@/components/dialogs/FluidSubSimplifiedDialog.vue'
import QuickCalibrationDialog from '@/components/dialogs/QuickCalibrationDialog.vue'
import VelocityModelingDialog from '@/components/dialogs/VelocityModelingDialog.vue'
import VelocityConversionDialog from '@/components/dialogs/VelocityConversionDialog.vue'
import TDConvertVolumeDialog from '@/components/dialogs/TDConvertVolumeDialog.vue'
import TDConvertHorizonDialog from '@/components/dialogs/TDConvertHorizonDialog.vue'
import TDConvertFaultDialog from '@/components/dialogs/TDConvertFaultDialog.vue'
import HorizonFromTopsDialog from '@/components/dialogs/HorizonFromTopsDialog.vue'
import HorizonSmoothDialog from '@/components/dialogs/HorizonSmoothDialog.vue'
import HorizonCalcDialog from '@/components/dialogs/HorizonCalcDialog.vue'
import HorizonInterpolateDialog from '@/components/dialogs/HorizonInterpolateDialog.vue'
import HorizonMergeDialog from '@/components/dialogs/HorizonMergeDialog.vue'
import HorizonDecimateDialog from '@/components/dialogs/HorizonDecimateDialog.vue'
import CompositeLogWindow from '@/components/dialogs/CompositeLogWindow.vue'

const workareaStore = useWorkareaStore()
const dialogStore = useDialogStore()
const dragOverlayVisible = ref(false)
const dragDepth = ref(0)

// --- Child window mode detection ---
const params = new URLSearchParams(window.location.search)
const childWindowId = ref(params.get('childWindow') || '')
const childComponent = ref<Component | null>(null)

function inferFileStem(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop() || ''
  return filename.replace(/\.[^.]+$/, '')
}

function getDataTypeLabel(dataType: string): string {
  return DATA_TYPES.find(item => item.value === dataType)?.label || dataType
}

async function openDroppedFile(filePath: string) {
  if (!workareaStore.isOpen) {
    ElMessage.warning('请先打开或创建工区')
    return
  }

  try {
    const detected = await detectImportFile({ file_path: filePath })
    if (detected.kind === 'image') {
      dialogStore.showImportImage(filePath, detected.display_name || inferFileStem(filePath))
      return
    }

    dialogStore.showImportFile(
      detected.data_type || '',
      filePath,
      detected.well_name || '',
    )

    if (detected.data_type) {
      ElMessage.success(`已识别为${getDataTypeLabel(detected.data_type)}`)
    }
    else {
      ElMessage.warning('未能完全识别数据类型，请在弹窗中手动确认')
    }
  }
  catch (error) {
    console.error('Failed to detect dropped file:', error)
    dialogStore.showImportFile('', filePath, '')
    ElMessage.warning('未能自动识别数据类型，请手动选择')
  }
}

function getDroppedPaths(event: DragEvent): string[] {
  const files = Array.from(event.dataTransfer?.files || [])
  return files
    .map(file => (file as File & { path?: string }).path || '')
    .filter(Boolean)
}

function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function handleWindowDragEnter(event: DragEvent) {
  if (childWindowId.value || !isFileDrag(event)) {
    return
  }
  event.preventDefault()
  dragDepth.value += 1
  dragOverlayVisible.value = true
}

function handleWindowDragOver(event: DragEvent) {
  if (childWindowId.value || !isFileDrag(event)) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  dragOverlayVisible.value = true
}

function handleWindowDragLeave(event: DragEvent) {
  if (childWindowId.value || !isFileDrag(event)) {
    return
  }
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    dragOverlayVisible.value = false
  }
}

async function handleWindowDrop(event: DragEvent) {
  if (childWindowId.value || !isFileDrag(event)) {
    return
  }
  event.preventDefault()
  dragDepth.value = 0
  dragOverlayVisible.value = false
  const filePaths = getDroppedPaths(event)
  if (!filePaths.length) {
    return
  }
  if (filePaths.length > 1) {
    ElMessage.info('当前一次仅处理第一个拖入文件')
  }
  await openDroppedFile(filePaths[0])
}

if (childWindowId.value) {
  // Mark body so global CSS can target teleported el-dialog
  document.body.classList.add('is-child-window')

  // Inject a <style> tag directly into <head> — guaranteed to load
  // regardless of Vite CSS injection order or scoped style specificity
  const styleEl = document.createElement('style')
  styleEl.textContent = `
    body.is-child-window .el-overlay {
      background: transparent !important;
    }
    body.is-child-window .el-overlay-dialog {
      overflow: hidden !important;
    }
    body.is-child-window .el-dialog {
      --el-dialog-width: 100% !important;
      margin: 0 !important;
      margin-top: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      padding: 0 !important;
      border-radius: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    body.is-child-window .el-dialog__header {
      display: none !important;
    }
    body.is-child-window .el-dialog__body {
      flex: 1 !important;
      min-height: 0 !important;
      max-height: none !important;
      height: auto !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 0 !important;
    }
    body.is-child-window .el-dialog__footer {
      flex-shrink: 0 !important;
    }
  `
  document.head.appendChild(styleEl)

  const def = CHILD_WINDOWS[childWindowId.value]
    || CHILD_WINDOWS[childWindowId.value.replace(/_\d+$/, '')]
  if (def) {
    // Dynamically load the dialog component
    childComponent.value = defineAsyncComponent(def.component)

    // Parse workarea path from URL
    const workareaPath = params.get('workarea') || ''
    const workareaName = workareaPath.split('/').pop() || workareaPath.split('\\').pop() || ''

    // Parse preset data
    const presetB64 = params.get('preset')
    if (presetB64) {
      try {
        const presetJson = JSON.parse(atob(presetB64))
        // Apply preset: compositeLog chartId
        if (presetJson.chartId != null) {
          dialogStore.compositeLogChartId = presetJson.chartId
        }
      } catch {
        // ignore invalid preset
      }
    }

    // Initialize workarea and well stores for the child window
    onMounted(async () => {
      if (workareaPath) {
        workareaStore.openWorkarea(workareaName, workareaPath)
        const wellStore = useWellStore()
        await wellStore.fetchWells(workareaPath)
      }
      // Set dialog visible so the component renders its content
      const visKey = def.visibilityKey as keyof typeof dialogStore
      ;(dialogStore as any)[visKey] = true

      // After dialog renders, force inline styles on the teleported elements
      // This overrides any scoped style regardless of specificity
      await nextTick()
      requestAnimationFrame(() => {
        applyChildWindowStyles()
      })
    })

    // Watch for dialog close → close the window
    const visKey = def.visibilityKey as keyof typeof dialogStore
    watch(
      () => (dialogStore as any)[visKey],
      (val: boolean) => {
        if (!val) {
          window.close()
        }
      }
    )
  }
}

onMounted(() => {
  window.addEventListener('dragenter', handleWindowDragEnter)
  window.addEventListener('dragover', handleWindowDragOver)
  window.addEventListener('dragleave', handleWindowDragLeave)
  window.addEventListener('drop', handleWindowDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', handleWindowDragEnter)
  window.removeEventListener('dragover', handleWindowDragOver)
  window.removeEventListener('dragleave', handleWindowDragLeave)
  window.removeEventListener('drop', handleWindowDrop)
})

/** Force inline styles on the teleported dialog DOM — overrides everything */
function applyChildWindowStyles() {
  const set = (el: HTMLElement | null, styles: Record<string, string>) => {
    if (!el) return
    for (const [prop, val] of Object.entries(styles)) {
      el.style.setProperty(prop, val, 'important')
    }
  }
  set(document.querySelector('.el-overlay'), {
    background: 'transparent'
  })
  set(document.querySelector('.el-overlay-dialog'), {
    overflow: 'hidden'
  })
  set(document.querySelector('.el-dialog'), {
    margin: '0',
    'margin-top': '0',
    width: '100%',
    height: '100%',
    'max-height': '100%',
    padding: '0',
    'border-radius': '0',
    display: 'flex',
    'flex-direction': 'column'
  })
  set(document.querySelector('.el-dialog__header'), {
    display: 'none'
  })
  set(document.querySelector('.el-dialog__body'), {
    flex: '1',
    'min-height': '0',
    'max-height': 'none',
    height: 'auto',
    overflow: 'hidden',
    display: 'flex',
    'flex-direction': 'column',
    padding: '0'
  })
}

function onCreateWorkarea() {
  dialogStore.showCreateWorkarea()
}

function onOpenWorkarea() {
  workareaStore.openWorkareaFromDisk()
}
</script>

<style scoped lang="scss">
.app-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.24);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.app-drop-card {
  min-width: 320px;
  padding: 28px 34px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  border: 2px dashed #2563eb;
  box-shadow: 0 24px 64px rgba(37, 99, 235, 0.18);
  text-align: center;
}

.app-drop-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.app-drop-subtitle {
  font-size: 14px;
  color: #475569;
}
</style>

<!-- Child window fullscreen overrides (unscoped, fallback for injected <style>) -->
<style>
body.is-child-window .el-overlay { background: transparent !important; }
body.is-child-window .el-dialog { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; max-height: 100% !important; display: flex !important; flex-direction: column !important; border-radius: 0 !important; }
body.is-child-window .el-dialog__header { display: none !important; }
body.is-child-window .el-dialog__body { flex: 1 !important; min-height: 0 !important; height: auto !important; max-height: none !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; padding: 0 !important; }
body.is-child-window .el-dialog__footer { flex-shrink: 0 !important; }
</style>
