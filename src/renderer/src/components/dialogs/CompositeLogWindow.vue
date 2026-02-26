<script setup lang="ts">
import type { CompositeLogConfig, LineStyleType, TrackConfig } from '@/types/compositeLog'
import type { CurveInfo, WellInfo } from '@/types/well'
import type { CompositeLogData } from '@/utils/compositeLogRenderer'
import {
  Delete,
  DocumentChecked,
  Download,
  FolderOpened,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import * as chartApi from '@/api/chart'
import * as wellApi from '@/api/well'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { createDefaultCurveStyle, createSuggestedTracks, CURVE_PRESETS, nextTrackId } from '@/types/compositeLog'
import { CompositeLogInteraction } from '@/utils/compositeLogInteraction'
import { CompositeLogRenderer } from '@/utils/compositeLogRenderer'
import { clearPatternCache } from '@/utils/lithologyPatterns'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()

// ── Visual constants for SVG dropdowns ──

const LINE_STYLES: Array<{ value: LineStyleType, label: string, dash: string }> = [
  { value: 'solid', label: '实线', dash: '' },
  { value: 'dashed', label: '虚线', dash: '6,3' },
  { value: 'dotted', label: '点线', dash: '2,2' },
]

const LINE_WIDTHS = [0.5, 1, 1.5, 2, 3, 5]

const TRACK_TYPE_LABELS: Record<string, string> = {
  formation: '地层',
  depth: '深度',
  lithology: '岩性',
  curve: '曲线',
  discrete: '离散',
  interpretation: '解释',
  mineral: '矿物',
  text: '文本',
}

function trackTypeLabel(type: string): string {
  return TRACK_TYPE_LABELS[type] || type
}

// ── State ──
const wells = ref<WellInfo[]>([])
const availableCurves = ref<CurveInfo[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasContainer = ref<HTMLDivElement | null>(null)
const selectedTrackId = ref<string | null>(null)

const config = ref<CompositeLogConfig>({
  wellName: '',
  title: '综合柱状图',
  depthRange: { min: 0, max: 500 },
  scale: 200,
  tracks: [],
})

const logData = ref<CompositeLogData>({
  curveData: {},
  layers: [],
  lithology: [],
  interpretations: [],
})

let renderer: CompositeLogRenderer | null = null
let interaction: CompositeLogInteraction | null = null
let rafId = 0
let resizeObs: ResizeObserver | null = null

const crosshairPos = ref({ x: -1, y: -1 })

const ctxMenu = ref<{
  visible: boolean
  x: number
  y: number
  track: TrackConfig | null
  depth: number
}>({ visible: false, x: 0, y: 0, track: null, depth: 0 })

// ── Computed: selected track object ──

const selectedTrack = computed(() => {
  if (!selectedTrackId.value)
    return null
  return config.value.tracks.find(t => t.id === selectedTrackId.value) || null
})

// ── Selected track property editing ──

function getSelectedTrackIndex(): number {
  if (!selectedTrackId.value)
    return -1
  return config.value.tracks.findIndex(t => t.id === selectedTrackId.value)
}

function onSelTrackField(field: string, val: unknown) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  tracks[idx] = { ...tracks[idx], [field]: val }
  config.value = { ...config.value, tracks }
}

function onAddCurveToSelected() {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  track.curves = [...(track.curves || []), createDefaultCurveStyle('')]
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onDeleteSelected() {
  const id = selectedTrackId.value
  if (!id)
    return
  selectedTrackId.value = null
  config.value = { ...config.value, tracks: config.value.tracks.filter(t => t.id !== id) }
}

function onSelCurveNameChange(curveIdx: number, newName: string) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]

  const preset = CURVE_PRESETS[newName]
  if (preset) {
    curves[curveIdx] = {
      ...curves[curveIdx],
      curveName: newName,
      color: preset.color,
      lineWidth: preset.lineWidth,
      unit: preset.unit,
      min: preset.min,
      max: preset.max,
      logarithmic: preset.logarithmic,
    }
  }
  else {
    curves[curveIdx] = { ...curves[curveIdx], curveName: newName }
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
  refreshCurveData()
}

function onSelCurveField(curveIdx: number, field: string, val: unknown) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  curves[curveIdx] = { ...curves[curveIdx], [field]: val }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelToggleFill(curveIdx: number, enabled: boolean) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  if (enabled) {
    curves[curveIdx] = { ...curves[curveIdx], fill: { color: curves[curveIdx].color, direction: 'left' } }
  }
  else {
    const { fill: _fill, ...rest } = curves[curveIdx]
    curves[curveIdx] = rest as typeof curves[number]
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelFillField(curveIdx: number, field: 'color' | 'direction', val: unknown) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  const cs = curves[curveIdx]
  if (cs.fill) {
    curves[curveIdx] = { ...cs, fill: { ...cs.fill, [field]: val } }
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelRemoveCurve(curveIdx: number) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  curves.splice(curveIdx, 1)
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

// ── Depth range ──

function onDepthMinChange(val: number | undefined) {
  if (val === undefined)
    return
  config.value = { ...config.value, depthRange: { ...config.value.depthRange, min: val } }
}

function onDepthMaxChange(val: number | undefined) {
  if (val === undefined)
    return
  config.value = { ...config.value, depthRange: { ...config.value.depthRange, max: val } }
}

// ── Watch dialog open ──
watch(
  () => dialogStore.compositeLogVisible,
  async (visible) => {
    if (visible && workareaStore.isOpen) {
      clearPatternCache()
      wells.value = await wellApi.listWells(workareaStore.path)
      if (dialogStore.compositeLogChartId) {
        await loadSavedChart(dialogStore.compositeLogChartId)
      }
      await nextTick()
      initCanvas()
    }
    else {
      destroyCanvas()
    }
  },
)

watch(config, () => scheduleRender(), { deep: true })
watch(selectedTrackId, () => scheduleRender())

// ── Well selection ──
async function onWellChange(wellName: string) {
  if (!wellName) {
    config.value = { ...config.value, wellName: '', tracks: [] }
    logData.value = { curveData: {}, layers: [], lithology: [], interpretations: [] }
    return
  }

  const wp = workareaStore.path
  try {
    availableCurves.value = await wellApi.getWellCurves(wellName, wp)

    const [layers, lithology, interpretations] = await Promise.all([
      wellApi.getLayers(wellName, wp).catch(() => []),
      wellApi.getLithology(wellName, wp).catch(() => []),
      wellApi.getInterpretation(wellName, wp).catch(() => []),
    ])

    logData.value = { curveData: {}, layers, lithology, interpretations }

    const allDepths: number[] = []
    for (const l of layers) {
      allDepths.push(l.top_depth, l.bottom_depth)
    }
    for (const li of lithology) {
      allDepths.push(li.top_depth, li.bottom_depth)
    }
    for (const interp of interpretations) {
      allDepths.push(interp.top_depth, interp.bottom_depth)
    }

    let depthMin = 0
    let depthMax = 3000
    if (allDepths.length > 0) {
      depthMin = Math.max(0, Math.min(...allDepths) - 20)
      depthMax = Math.max(...allDepths) + 20
    }

    const keepTracks = config.value.tracks
    config.value = {
      wellName,
      title: `${wellName} 综合柱状图`,
      depthRange: { min: depthMin, max: depthMax },
      scale: 200,
      tracks: keepTracks,
    }

    await refreshCurveData()

    if (Object.keys(logData.value.curveData).length > 0) {
      const curveDepths: number[] = []
      for (const pts of Object.values(logData.value.curveData)) {
        if (pts.length > 0) {
          curveDepths.push(pts[0].depth, pts[pts.length - 1].depth)
        }
      }
      if (curveDepths.length > 0) {
        const cMin = Math.min(...curveDepths)
        const cMax = Math.max(...curveDepths)
        if (allDepths.length === 0 || cMin < depthMin || cMax > depthMax) {
          depthMin = Math.max(0, Math.min(depthMin, cMin - 10))
          depthMax = Math.max(depthMax, cMax + 10)
          config.value = { ...config.value, depthRange: { min: depthMin, max: depthMax } }
        }
      }
    }

    if (keepTracks.length === 0) {
      try {
        await ElMessageBox.confirm(
          '是否使用推荐布局自动生成道配置？',
          '推荐布局',
          { confirmButtonText: '使用推荐', cancelButtonText: '手动配置', type: 'info' },
        )
        applySuggestedLayout()
      }
      catch { /* user chose manual */ }
    }
  }
  catch (e) {
    console.error('Failed to load well data:', e)
    ElMessage.error('加载井数据失败')
  }
}

async function applySuggestedLayout() {
  if (!config.value.wellName) {
    ElMessage.warning('请先选择井')
    return
  }
  const curveNames = availableCurves.value.map(c => c.name)
  const suggestedTracks = createSuggestedTracks(curveNames)
  config.value = { ...config.value, tracks: suggestedTracks }
  await refreshCurveData()
}

async function refreshCurveData() {
  const curveNames = new Set<string>()
  for (const track of config.value.tracks) {
    if (track.curves) {
      for (const cs of track.curves) {
        if (cs.curveName)
          curveNames.add(cs.curveName)
      }
    }
    if (track.mineralCurves) {
      for (const mc of track.mineralCurves) {
        if (mc.curveName)
          curveNames.add(mc.curveName)
      }
    }
  }
  if (curveNames.size === 0 || !config.value.wellName)
    return

  try {
    const data = await wellApi.getCurveData(config.value.wellName, workareaStore.path, [...curveNames])
    logData.value = { ...logData.value, curveData: { ...logData.value.curveData, ...data } }
  }
  catch (e) {
    console.error('Failed to load curve data:', e)
  }
}

// ── Canvas init / destroy ──

function createInteractionCallbacks() {
  return {
    onDepthRangeChange: (min: number, max: number) => {
      config.value = { ...config.value, depthRange: { min, max } }
    },
    onCrosshairMove: (x: number, y: number) => {
      crosshairPos.value = { x, y }
      scheduleRender()
    },
    onContextMenu: (event: MouseEvent, track: TrackConfig | null, depth: number) => {
      ctxMenu.value = { visible: true, x: event.clientX, y: event.clientY, track, depth }
    },
    onRequestRender: () => scheduleRender(),
    onTrackReorder: (fromTrackId: string, toTrackId: string) => {
      const tracks = [...config.value.tracks]
      const fromIdx = tracks.findIndex(t => t.id === fromTrackId)
      const toIdx = tracks.findIndex(t => t.id === toTrackId)
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx)
        return
      const [moved] = tracks.splice(fromIdx, 1)
      tracks.splice(toIdx, 0, moved)
      config.value = { ...config.value, tracks }
    },
    onTrackSelect: (trackId: string | null) => {
      selectedTrackId.value = trackId
    },
  }
}

function initCanvas() {
  const canvas = canvasRef.value
  const container = canvasContainer.value
  if (!canvas || !container)
    return

  const dpr = window.devicePixelRatio || 1
  const w = container.clientWidth
  const h = container.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  canvas.style.cursor = 'crosshair'

  renderer = new CompositeLogRenderer(canvas, config.value, logData.value)
  interaction = new CompositeLogInteraction(canvas, config.value, renderer, createInteractionCallbacks())

  document.addEventListener('click', closeCtxMenu)
  scheduleRender()
  setupResizeObserver()
}

function destroyCanvas() {
  if (interaction) {
    interaction.detach()
    interaction = null
  }
  renderer = null
  if (rafId)
    cancelAnimationFrame(rafId)
  document.removeEventListener('click', closeCtxMenu)
  resizeObs?.disconnect()
}

onBeforeUnmount(destroyCanvas)

function scheduleRender() {
  if (rafId)
    cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(doRender)
}

function doRender() {
  if (!renderer)
    return
  renderer.updateConfig(config.value)
  renderer.updateData(logData.value)
  renderer.setSelectedTrack(selectedTrackId.value)
  if (interaction)
    interaction.updateConfig(config.value)
  renderer.render()
  if (crosshairPos.value.x >= 0 && crosshairPos.value.y >= 0) {
    renderer.drawCrosshair(crosshairPos.value.x, crosshairPos.value.y)
  }
}

function setupResizeObserver() {
  const container = canvasContainer.value
  if (!container)
    return
  resizeObs = new ResizeObserver(() => {
    const canvas = canvasRef.value
    if (!canvas || !container)
      return
    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    clearPatternCache()
    if (renderer) {
      renderer = new CompositeLogRenderer(canvas, config.value, logData.value)
      if (interaction) {
        interaction.detach()
        interaction = new CompositeLogInteraction(canvas, config.value, renderer, createInteractionCallbacks())
      }
      scheduleRender()
    }
  })
  resizeObs.observe(container)
}

// ── Zoom ──
function zoomIn() {
  const { min, max } = config.value.depthRange
  const center = (min + max) / 2
  const newRange = (max - min) * 0.75
  config.value = { ...config.value, depthRange: { min: Math.max(0, center - newRange / 2), max: center + newRange / 2 } }
}

function zoomOut() {
  const { min, max } = config.value.depthRange
  const center = (min + max) / 2
  const newRange = (max - min) * 1.33
  config.value = { ...config.value, depthRange: { min: Math.max(0, center - newRange / 2), max: center + newRange / 2 } }
}

// ── Save / Load ──
async function onSave() {
  if (!config.value.wellName) {
    ElMessage.warning('请先选择井')
    return
  }
  try {
    const canvas = canvasRef.value
    const thumbnail = canvas ? canvas.toDataURL('image/png', 0.3) : ''
    const name = `${config.value.wellName}_综合柱状图`
    await chartApi.saveChart(workareaStore.path, name, 'composite_log', thumbnail, JSON.stringify(config.value))
    ElMessage.success('已保存')
  }
  catch { ElMessage.error('保存失败') }
}

async function onLoad() {
  try {
    const charts = await chartApi.listCharts(workareaStore.path, 'composite_log')
    if (!charts.length) {
      ElMessage.info('暂无已保存的综合柱状图')
      return
    }
    const chart = await chartApi.getChart(workareaStore.path, charts[0].id)
    const parsed = JSON.parse(chart.config) as CompositeLogConfig
    config.value = parsed
    if (parsed.wellName) {
      availableCurves.value = await wellApi.getWellCurves(parsed.wellName, workareaStore.path).catch(() => [])
      const [layers, lithology, interpretations] = await Promise.all([
        wellApi.getLayers(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getLithology(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getInterpretation(parsed.wellName, workareaStore.path).catch(() => []),
      ])
      logData.value = { curveData: {}, layers, lithology, interpretations }
      await refreshCurveData()
    }
    ElMessage.success(`已加载: ${chart.name}`)
  }
  catch { ElMessage.error('加载失败') }
}

async function loadSavedChart(chartId: number) {
  try {
    const chart = await chartApi.getChart(workareaStore.path, chartId)
    const parsed = JSON.parse(chart.config) as CompositeLogConfig
    config.value = parsed
    if (parsed.wellName) {
      availableCurves.value = await wellApi.getWellCurves(parsed.wellName, workareaStore.path).catch(() => [])
      const [layers, lithology, interpretations] = await Promise.all([
        wellApi.getLayers(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getLithology(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getInterpretation(parsed.wellName, workareaStore.path).catch(() => []),
      ])
      logData.value = { curveData: {}, layers, lithology, interpretations }
      await refreshCurveData()
    }
  }
  catch { console.error('Failed to load saved chart') }
}

function exportPng() {
  const canvas = canvasRef.value
  if (!canvas)
    return
  const link = document.createElement('a')
  link.download = `${config.value.wellName || 'composite_log'}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ── Context menu ──
function closeCtxMenu() {
  ctxMenu.value = { ...ctxMenu.value, visible: false }
}

function ctxSelectTrack() {
  if (ctxMenu.value.track) {
    selectedTrackId.value = ctxMenu.value.track.id
  }
  closeCtxMenu()
}

function ctxAddCurve() {
  if (!ctxMenu.value.track)
    return
  const idx = config.value.tracks.findIndex(t => t.id === ctxMenu.value.track!.id)
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  track.curves = [...(track.curves || []), createDefaultCurveStyle('')]
  tracks[idx] = track
  config.value = { ...config.value, tracks }
  selectedTrackId.value = ctxMenu.value.track.id
  closeCtxMenu()
}

function ctxRemoveTrack() {
  if (!ctxMenu.value.track)
    return
  if (selectedTrackId.value === ctxMenu.value.track.id)
    selectedTrackId.value = null
  config.value = { ...config.value, tracks: config.value.tracks.filter(t => t.id !== ctxMenu.value.track!.id) }
  closeCtxMenu()
}

function ctxToggleFill() {
  if (!ctxMenu.value.track?.curves?.length)
    return
  const idx = config.value.tracks.findIndex(t => t.id === ctxMenu.value.track!.id)
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  const cs = curves[0]
  if (cs.fill) {
    const { fill: _fill2, ...rest } = cs
    curves[0] = rest as typeof cs
  }
  else {
    curves[0] = { ...cs, fill: { color: cs.color, direction: 'left' } }
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
  closeCtxMenu()
}

function ctxAddCurveTrack() {
  const track: TrackConfig = { id: nextTrackId(), type: 'curve', title: '新曲线道', width: 140, visible: true, curves: [] }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  selectedTrackId.value = track.id
  closeCtxMenu()
}

function ctxAddDepthTrack() {
  const track: TrackConfig = { id: nextTrackId(), type: 'depth', title: '深度(m)', width: 55, visible: true }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  closeCtxMenu()
}

function ctxAddLithTrack() {
  const track: TrackConfig = { id: nextTrackId(), type: 'lithology', title: '岩性', width: 55, visible: true }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  closeCtxMenu()
}

function ctxAddInterpTrack() {
  const track: TrackConfig = { id: nextTrackId(), type: 'interpretation', title: '解释结论', width: 80, visible: true }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  closeCtxMenu()
}

function ctxAddMineralTrack() {
  const track: TrackConfig = { id: nextTrackId(), type: 'mineral', title: '矿物含量', width: 120, visible: true, mineralCurves: [] }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  closeCtxMenu()
}

function ctxAddTextTrack() {
  const track: TrackConfig = { id: nextTrackId(), type: 'text', title: '综合结论', width: 80, visible: true, textContent: [] }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  closeCtxMenu()
}
</script>

<template>
  <el-dialog
    v-model="dialogStore.compositeLogVisible"
    title="井曲线"
    width="95%"
    top="2vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="composite-log-dialog"
  >
    <!-- Toolbar row 1: file ops + well + depth + zoom -->
    <div class="cl-toolbar">
      <el-button size="small" :icon="FolderOpened" @click="onLoad">
        加载
      </el-button>
      <el-button size="small" :icon="DocumentChecked" @click="onSave">
        保存
      </el-button>
      <el-divider direction="vertical" />
      <span class="tb-label">井:</span>
      <el-select
        :model-value="config.wellName"
        placeholder="选择井"
        size="small"
        filterable
        style="width: 120px"
        @change="onWellChange"
      >
        <el-option v-for="w in wells" :key="w.name" :label="w.name" :value="w.name" />
      </el-select>
      <el-divider direction="vertical" />
      <span class="tb-label">深度:</span>
      <el-input-number
        :model-value="config.depthRange.min"
        size="small"
        :step="10"
        :min="0"
        controls-position="right"
        style="width: 80px"
        @change="onDepthMinChange"
      />
      <span class="tb-sep">–</span>
      <el-input-number
        :model-value="config.depthRange.max"
        size="small"
        :step="10"
        :min="config.depthRange.min + 10"
        controls-position="right"
        style="width: 80px"
        @change="onDepthMaxChange"
      />
      <el-divider direction="vertical" />
      <el-button size="small" :icon="ZoomIn" @click="zoomIn" />
      <el-button size="small" :icon="ZoomOut" @click="zoomOut" />
      <el-divider direction="vertical" />
      <el-button size="small" @click="applySuggestedLayout">
        推荐布局
      </el-button>
      <el-button size="small" :icon="Download" @click="exportPng">
        导出
      </el-button>
      <div class="toolbar-spacer" />
      <span class="toolbar-info">
        {{ config.depthRange.min.toFixed(0) }}–{{ config.depthRange.max.toFixed(0) }}m |
        1:{{ config.scale }}
      </span>
    </div>

    <!-- Property bar: selected track editing -->
    <div v-if="selectedTrack" class="cl-propbar">
      <!-- Track-level props -->
      <div class="prop-row">
        <span class="prop-label">{{ trackTypeLabel(selectedTrack.type) }}道</span>
        <el-input
          :model-value="selectedTrack.title"
          size="small"
          style="width: 100px"
          @change="onSelTrackField('title', $event)"
        />
        <span class="prop-label">宽:</span>
        <el-input-number
          :model-value="selectedTrack.width"
          size="small"
          :min="30" :max="400" :step="10"
          controls-position="right"
          style="width: 70px"
          @change="onSelTrackField('width', $event)"
        />
        <el-color-picker
          :model-value="selectedTrack.bgColor || '#ffffff'"
          size="small"
          @change="onSelTrackField('bgColor', $event)"
        />
        <template v-if="selectedTrack.type === 'curve' || selectedTrack.type === 'discrete'">
          <el-button size="small" @click="onAddCurveToSelected">
            + 曲线
          </el-button>
        </template>
        <el-button size="small" type="danger" plain @click="onDeleteSelected">
          删除道
        </el-button>
        <el-button size="small" plain @click="selectedTrackId = null">
          取消选择
        </el-button>
      </div>

      <!-- Curve rows (for curve/discrete tracks) -->
      <template v-if="(selectedTrack.type === 'curve' || selectedTrack.type === 'discrete') && selectedTrack.curves?.length">
        <div v-for="(cs, ci) in selectedTrack.curves" :key="ci" class="prop-row curve-row">
          <el-select
            :model-value="cs.curveName"
            size="small"
            filterable
            placeholder="曲线"
            style="width: 110px"
            @change="onSelCurveNameChange(ci, $event as string)"
          >
            <el-option
              v-for="c in availableCurves"
              :key="c.name"
              :label="`${c.name} (${c.unit})`"
              :value="c.name"
            />
          </el-select>
          <el-color-picker
            :model-value="cs.color"
            size="small"
            @change="onSelCurveField(ci, 'color', $event)"
          />
          <!-- Line style SVG -->
          <el-select
            :model-value="cs.lineStyle"
            size="small"
            style="width: 80px"
            @change="onSelCurveField(ci, 'lineStyle', $event)"
          >
            <el-option v-for="ls in LINE_STYLES" :key="ls.value" :value="ls.value" :label="ls.label">
              <span class="style-opt"><svg width="36" height="12"><line x1="0" y1="6" x2="36" y2="6" :stroke="cs.color" stroke-width="2" :stroke-dasharray="ls.dash" /></svg><span>{{ ls.label }}</span></span>
            </el-option>
          </el-select>
          <!-- Line width SVG -->
          <el-select
            :model-value="cs.lineWidth"
            size="small"
            style="width: 72px"
            @change="onSelCurveField(ci, 'lineWidth', $event)"
          >
            <el-option v-for="lw in LINE_WIDTHS" :key="lw" :value="lw" :label="`${lw}px`">
              <span class="style-opt"><svg width="32" height="12"><line x1="0" y1="6" x2="32" y2="6" :stroke="cs.color" :stroke-width="lw" /></svg><span>{{ lw }}px</span></span>
            </el-option>
          </el-select>
          <!-- Draw mode SVG -->
          <el-select
            :model-value="cs.drawMode || 'line'"
            size="small"
            style="width: 80px"
            @change="onSelCurveField(ci, 'drawMode', $event)"
          >
            <el-option value="line" label="连线">
              <span class="style-opt"><svg width="24" height="12"><polyline points="0,10 6,3 12,8 18,1 24,5" fill="none" :stroke="cs.color" stroke-width="1.5" /></svg><span>连线</span></span>
            </el-option>
            <el-option value="bar" label="杠线">
              <span class="style-opt"><svg width="24" height="12"><line x1="0" y1="2" x2="16" y2="2" :stroke="cs.color" stroke-width="1.5" /><line x1="0" y1="6" x2="10" y2="6" :stroke="cs.color" stroke-width="1.5" /><line x1="0" y1="10" x2="20" y2="10" :stroke="cs.color" stroke-width="1.5" /></svg><span>杠线</span></span>
            </el-option>
          </el-select>
          <el-divider direction="vertical" />
          <span class="prop-label">范围:</span>
          <el-input-number
            :model-value="cs.min"
            size="small"
            controls-position="right"
            style="width: 80px"
            @change="onSelCurveField(ci, 'min', $event)"
          />
          <span class="tb-sep">–</span>
          <el-input-number
            :model-value="cs.max"
            size="small"
            controls-position="right"
            style="width: 80px"
            @change="onSelCurveField(ci, 'max', $event)"
          />
          <el-checkbox
            :model-value="cs.logarithmic || false"
            size="small"
            @change="onSelCurveField(ci, 'logarithmic', $event)"
          >
            log
          </el-checkbox>
          <el-divider direction="vertical" />
          <el-checkbox
            :model-value="!!cs.fill"
            size="small"
            @change="onSelToggleFill(ci, $event as boolean)"
          >
            填充
          </el-checkbox>
          <template v-if="cs.fill">
            <el-color-picker
              :model-value="cs.fill.color"
              size="small"
              @change="onSelFillField(ci, 'color', $event)"
            />
            <el-radio-group
              :model-value="cs.fill.direction"
              size="small"
              @change="onSelFillField(ci, 'direction', $event)"
            >
              <el-radio-button value="left">
                <svg width="16" height="12" style="vertical-align: middle"><rect x="0" y="0" width="10" height="12" fill="currentColor" opacity="0.3" /><line x1="10" y1="0" x2="10" y2="12" stroke="currentColor" stroke-width="1.5" /></svg>
              </el-radio-button>
              <el-radio-button value="right">
                <svg width="16" height="12" style="vertical-align: middle"><rect x="6" y="0" width="10" height="12" fill="currentColor" opacity="0.3" /><line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" stroke-width="1.5" /></svg>
              </el-radio-button>
            </el-radio-group>
          </template>
          <el-button size="small" :icon="Delete" circle @click="onSelRemoveCurve(ci)" />
        </div>
      </template>
    </div>

    <!-- Canvas (full width, no sidebar) -->
    <div class="cl-body">
      <div ref="canvasContainer" class="cl-canvas-wrapper">
        <canvas ref="canvasRef" class="cl-canvas" />
      </div>
    </div>

    <!-- Context menu -->
    <div
      v-if="ctxMenu.visible"
      class="ctx-menu"
      :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
    >
      <template v-if="ctxMenu.track?.type === 'curve'">
        <div class="ctx-item" @click="ctxAddCurve">
          添加曲线到此道
        </div>
        <div class="ctx-item" @click="ctxSelectTrack">
          选中此道
        </div>
        <div class="ctx-item" @click="ctxToggleFill">
          切换填充
        </div>
        <div class="ctx-item danger" @click="ctxRemoveTrack">
          删除此道
        </div>
      </template>
      <template v-else-if="ctxMenu.track">
        <div class="ctx-item" @click="ctxSelectTrack">
          选中此道
        </div>
        <div class="ctx-item danger" @click="ctxRemoveTrack">
          删除此道
        </div>
      </template>
      <div class="ctx-separator" />
      <div class="ctx-item" @click="ctxAddCurveTrack">
        添加曲线道
      </div>
      <div class="ctx-item" @click="ctxAddDepthTrack">
        添加深度道
      </div>
      <div class="ctx-item" @click="ctxAddLithTrack">
        添加岩性道
      </div>
      <div class="ctx-item" @click="ctxAddInterpTrack">
        添加解释道
      </div>
      <div class="ctx-item" @click="ctxAddMineralTrack">
        添加矿物道
      </div>
      <div class="ctx-item" @click="ctxAddTextTrack">
        添加文本道
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.composite-log-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: calc(90vh - 60px);
  }
}

.cl-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.tb-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.tb-sep {
  margin: 0 2px;
  color: #999;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-info {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.cl-propbar {
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fb;
  padding: 4px 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.prop-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 12px;
}

.prop-label {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}

.curve-row {
  padding: 2px 0;
  border-top: 1px solid #eee;
}

.style-opt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  svg { flex-shrink: 0; }
}

.cl-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.cl-canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #fff;
}

.cl-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.ctx-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 140px;
  padding: 4px 0;
}

.ctx-item {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 12px;
  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
  &.danger:hover {
    background: #fef0f0;
    color: #f56c6c;
  }
}

.ctx-separator {
  height: 1px;
  background: #eee;
  margin: 4px 8px;
}
</style>
