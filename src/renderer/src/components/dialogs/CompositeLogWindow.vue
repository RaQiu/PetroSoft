<script setup lang="ts">
import type { CompositeLogConfig, CurveColorRamp, CurveStyle, FractureImageConfig, GridConfig, LineStyleType, TrackConfig } from '@/types/compositeLog.ts'
import type { CurveInfo, WellInfo } from '@/types/well'
import type { CompositeLogDebugEntry } from '@/utils/compositeLogDebug.ts'
import type { CompositeLogData, FractureImageSelection, SelectedCurvePoint, SelectionRect } from '@/utils/compositeLogRenderer.ts'
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
import { createDefaultCurveStyle, createSuggestedTracks, DEFAULT_CURVE_COLOR_RAMP, defaultGridConfig, getCurvePreset, nextFractureImageId, nextTrackId, normalizeCurveStyle, normalizeFractureImage, normalizeTracksCurveStyles } from '@/types/compositeLog.ts'
import { addCompositeLogDebugListener, emitCompositeLogDebug } from '@/utils/compositeLogDebug.ts'
import { CompositeLogInteraction } from '@/utils/compositeLogInteraction.ts'
import { CompositeLogRenderer } from '@/utils/compositeLogRenderer.ts'
import { clearPatternCache, preloadLithologyTiles } from '@/utils/lithologyPatterns'

// Preload lithology tile images on module load
preloadLithologyTiles()

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
  fracture: '裂缝',
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
const selectedFractureImage = ref<FractureImageSelection | null>(null)
const fractureLibraryVisible = ref(false)
const fractureLibraryLoading = ref(false)
const fractureLibraryTargetTrackId = ref('')
const fractureLibraryItems = ref<Array<{
  id: number
  name: string
  thumbnail: string
  src: string
  width: number
  height: number
}>>([])
const selectedFractureLibraryChartId = ref<number | null>(null)

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
const selectionRect = ref<SelectionRect | null>(null)
const selectedCurvePoints = ref<SelectedCurvePoint[]>([])
const debugEntries = ref<CompositeLogDebugEntry[]>([])
let removeDebugListener: (() => void) | null = null

function formatDebugPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload)
}

function expandCurveToLogRange(curve: CurveStyle): CurveStyle {
  const normalized = normalizeCurveStyle({ ...curve, logarithmic: true })
  let minPower = Math.floor(Math.log10(normalized.min))
  let maxPower = Math.ceil(Math.log10(normalized.max))
  if (maxPower - minPower < 2) {
    const missing = 2 - (maxPower - minPower)
    minPower -= Math.floor(missing / 2)
    maxPower += Math.ceil(missing / 2)
  }
  return normalizeCurveStyle({
    ...normalized,
    logarithmic: true,
    min: 10 ** minPower,
    max: 10 ** maxPower,
  })
}

const ctxMenu = ref<{
  visible: boolean
  x: number
  y: number
  track: TrackConfig | null
  depth: number
}>({ visible: false, x: 0, y: 0, track: null, depth: 0 })

// ── Computed: selected track object ──

/** Load continuous + discrete curve names for a well */
async function loadCurveList(wellName: string) {
  const [contCurves, discData] = await Promise.all([
    wellApi.getWellCurves(wellName, workareaStore.path).catch(() => [] as CurveInfo[]),
    wellApi.getDiscreteCurves(wellName, workareaStore.path).catch(() => ({} as Record<string, unknown[]>)),
  ])
  const contNames = new Set(contCurves.map(c => c.name))
  const discEntries: CurveInfo[] = Object.keys(discData)
    .filter(n => !contNames.has(n))
    .map((n, i) => ({ id: -(i + 1), name: n, unit: '', sample_interval: 0 }))
  availableCurves.value = [...contCurves, ...discEntries]
}

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

function createFractureTrack(): TrackConfig {
  return { id: nextTrackId(), type: 'fracture', title: '裂缝道', width: 120, visible: true, fractureImages: [] }
}

function inferFileStem(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop() || ''
  return filename.replace(/\.[^.]+$/, '')
}

function getDepthSpan(): number {
  return Math.max(1, config.value.depthRange.max - config.value.depthRange.min)
}

function normalizeFractureImageWithinTrack(image: FractureImageConfig): FractureImageConfig {
  const normalized = normalizeFractureImage(image)
  const depthMin = config.value.depthRange.min
  const depthMax = config.value.depthRange.max
  let topDepth = normalized.topDepth
  let bottomDepth = normalized.bottomDepth
  const span = Math.max(1, bottomDepth - topDepth)

  if (topDepth < depthMin) {
    bottomDepth += depthMin - topDepth
    topDepth = depthMin
  }
  if (bottomDepth > depthMax) {
    topDepth -= bottomDepth - depthMax
    bottomDepth = depthMax
  }
  if (topDepth < depthMin) {
    topDepth = depthMin
  }
  if (bottomDepth > depthMax) {
    bottomDepth = depthMax
  }
  if (bottomDepth - topDepth < 1) {
    topDepth = Math.max(depthMin, Math.min(topDepth, depthMax - Math.min(span, getDepthSpan())))
    bottomDepth = Math.min(depthMax, topDepth + Math.max(1, Math.min(span, getDepthSpan())))
  }

  return normalizeFractureImage({
    ...normalized,
    topDepth,
    bottomDepth,
  })
}

async function loadImageDimensions(src: string): Promise<{ width: number, height: number }> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('image-load-failed'))
    image.src = src
  })
  return { width: image.naturalWidth, height: image.naturalHeight }
}

function parseStoredFractureChart(detail: { id: number, name: string, thumbnail: string, config: string }) {
  try {
    const parsed = JSON.parse(detail.config || '{}') as Partial<{
      kind: string
      name: string
      src: string
      width: number
      height: number
    }>
    const src = typeof parsed.src === 'string' && parsed.src ? parsed.src : detail.thumbnail
    if (!src) {
      return null
    }
    return {
      id: detail.id,
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : detail.name,
      thumbnail: detail.thumbnail || src,
      src,
      width: Number.isFinite(parsed.width) ? Number(parsed.width) : 0,
      height: Number.isFinite(parsed.height) ? Number(parsed.height) : 0,
    }
  }
  catch {
    if (!detail.thumbnail) {
      return null
    }
    return {
      id: detail.id,
      name: detail.name,
      thumbnail: detail.thumbnail,
      src: detail.thumbnail,
      width: 0,
      height: 0,
    }
  }
}

async function createImageThumbnail(src: string): Promise<string> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('thumb-load-failed'))
    image.src = src
  })

  const width = image.naturalWidth || 1
  const height = image.naturalHeight || 1
  const scale = Math.min(1, 320 / width, 240 / height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return src
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL('image/jpeg', 0.82)
  }
  catch {
    return src
  }
}

async function readImageDataUrl(filePath: string): Promise<string> {
  if (typeof window.api?.readImageAsDataUrl !== 'function') {
    throw new Error('image-reader-unavailable')
  }
  return window.api.readImageAsDataUrl(filePath)
}

async function appendFractureImageToTrack(trackId: string, payload: {
  name: string
  src: string
  width?: number
  height?: number
}) {
  const dimensions = payload.width && payload.height
    ? { width: payload.width, height: payload.height }
    : await loadImageDimensions(payload.src)
  const metrics = renderer?.getMetrics()
  const trackRect = metrics?.trackRects.find(track => track.trackId === trackId)
  const bodyHeight = metrics?.bodyHeight || 1
  const depthSpan = getDepthSpan()
  const widthRatio = 0.72
  const leftRatio = (1 - widthRatio) / 2
  const rightRatio = leftRatio + widthRatio
  const desiredWidthPx = (trackRect?.width || 120) * widthRatio
  const desiredHeightPx = dimensions.width > 0 ? desiredWidthPx * (dimensions.height / dimensions.width) : bodyHeight * 0.2
  const desiredDepthSpan = Math.max(2, Math.min(depthSpan * 0.45, (desiredHeightPx / bodyHeight) * depthSpan))
  const topDepth = config.value.depthRange.min + depthSpan * 0.08
  const image = normalizeFractureImageWithinTrack({
    id: nextFractureImageId(),
    name: payload.name || '裂缝图片',
    src: payload.src,
    leftRatio,
    rightRatio,
    topDepth,
    bottomDepth: topDepth + desiredDepthSpan,
    opacity: 1,
  })

  updateTrack(trackId, track => ({
    ...track,
    fractureImages: [...(track.fractureImages || []), image],
  }))
  selectFractureImage(trackId, image.id)
  scheduleRender()
  return image
}

function updateTrack(trackId: string, updater: (track: TrackConfig) => TrackConfig) {
  const trackIndex = config.value.tracks.findIndex(track => track.id === trackId)
  if (trackIndex < 0) {
    return
  }
  const tracks = [...config.value.tracks]
  tracks[trackIndex] = updater({ ...tracks[trackIndex] })
  config.value = { ...config.value, tracks }
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
  if (selectedFractureImage.value?.trackId === id) {
    selectedFractureImage.value = null
  }
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

  const preset = getCurvePreset(newName)
  if (preset) {
    const nextCurve = normalizeCurveStyle({
      ...curves[curveIdx],
      curveName: newName,
      color: preset.color,
      lineWidth: preset.lineWidth,
      valueColoring: true,
      unit: preset.unit,
      min: preset.min,
      max: preset.max,
      logarithmic: preset.logarithmic,
    })
    curves[curveIdx] = nextCurve.logarithmic ? expandCurveToLogRange(nextCurve) : nextCurve
  }
  else {
    curves[curveIdx] = normalizeCurveStyle({ ...curves[curveIdx], curveName: newName })
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
  const nextCurve: CurveStyle = {
    ...curves[curveIdx],
    [field]: val,
  }
  if (field === 'color' && nextCurve.fill && nextCurve.fill.customColor !== true) {
    nextCurve.fill = {
      ...nextCurve.fill,
      color: nextCurve.color,
    }
  }
  const normalizedCurve = normalizeCurveStyle(nextCurve)
  curves[curveIdx] = field === 'logarithmic' && Boolean(val)
    ? expandCurveToLogRange(normalizedCurve)
    : normalizedCurve
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelCurveColorModeChange(curveIdx: number, enabled: boolean) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  const curve = curves[curveIdx]
  curves[curveIdx] = {
    ...curve,
    valueColoring: enabled,
    colorRamp: curve.colorRamp ? { ...curve.colorRamp } : { ...DEFAULT_CURVE_COLOR_RAMP },
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelCurveColorRampField(curveIdx: number, field: keyof CurveColorRamp, val: unknown) {
  if (typeof val !== 'string') {
    return
  }
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  const curve = curves[curveIdx]
  curves[curveIdx] = {
    ...curve,
    colorRamp: {
      ...(curve.colorRamp || DEFAULT_CURVE_COLOR_RAMP),
      [field]: val,
    },
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function getCurvePreviewStrokeColor(curve: CurveStyle): string {
  if (curve.valueColoring === false) {
    return curve.color
  }
  return curve.colorRamp?.mid || DEFAULT_CURVE_COLOR_RAMP.mid
}

function getCurveColorPreviewStyle(curve: CurveStyle) {
  if (curve.valueColoring === false) {
    return {
      background: curve.color,
      borderColor: curve.color,
    }
  }
  const ramp = curve.colorRamp || DEFAULT_CURVE_COLOR_RAMP
  return {
    background: `linear-gradient(90deg, ${ramp.low} 0%, ${ramp.mid} 50%, ${ramp.high} 100%)`,
    borderColor: ramp.mid,
  }
}

function onSelToggleFill(curveIdx: number, enabled: boolean) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  if (enabled) {
    curves[curveIdx] = { ...curves[curveIdx], fill: { color: curves[curveIdx].color, direction: 'left', customColor: false, opacity: 1 } }
  }
  else {
    const { fill: _fill, ...rest } = curves[curveIdx]
    curves[curveIdx] = rest as typeof curves[number]
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelFillCustomColorToggle(curveIdx: number, enabled: boolean) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  const cs = curves[curveIdx]
  if (cs.fill) {
    curves[curveIdx] = {
      ...cs,
      fill: {
        ...cs.fill,
        color: enabled ? cs.fill.color : cs.color,
        customColor: enabled,
      },
    }
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

function onSelFillField(curveIdx: number, field: 'color' | 'direction' | 'opacity', val: unknown) {
  const idx = getSelectedTrackIndex()
  if (idx < 0)
    return
  const tracks = [...config.value.tracks]
  const track = { ...tracks[idx] }
  const curves = [...(track.curves || [])]
  const cs = curves[curveIdx]
  if (cs.fill) {
    if (field === 'opacity' && typeof val === 'number' && Number.isFinite(val)) {
      curves[curveIdx] = { ...cs, fill: { ...cs.fill, opacity: Math.max(0, Math.min(1, val)) } }
    }
    else {
      curves[curveIdx] = { ...cs, fill: { ...cs.fill, [field]: val } }
    }
  }
  track.curves = curves
  tracks[idx] = track
  config.value = { ...config.value, tracks }
}

// ── Grid config ──

const gridConfig = computed(() => config.value.grid || defaultGridConfig())

function onGridFieldChange(field: keyof GridConfig, val: unknown) {
  const current = config.value.grid || defaultGridConfig()
  config.value = { ...config.value, grid: { ...current, [field]: val } }
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

function updateFractureImage(trackId: string, imageId: string, patch: Partial<FractureImageConfig>) {
  updateTrack(trackId, (track) => {
    const images = (track.fractureImages || []).map((image) => {
      if (image.id !== imageId) {
        return image
      }
      return normalizeFractureImageWithinTrack({
        ...image,
        ...patch,
      })
    })
    return {
      ...track,
      fractureImages: images,
    }
  })
}

function selectFractureImage(trackId: string, imageId: string | null) {
  if (!imageId) {
    selectedFractureImage.value = null
    return
  }
  selectedTrackId.value = trackId
  selectedFractureImage.value = { trackId, imageId }
}

async function importFractureImageToTrack(trackId: string) {
  const result = await window.api.openFile([
    { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
  ])
  if (result.canceled || !result.filePaths.length) {
    return
  }

  const filePath = result.filePaths[0]
  try {
    const src = await readImageDataUrl(filePath)
    const { width, height } = await loadImageDimensions(src)
    await appendFractureImageToTrack(trackId, {
      name: inferFileStem(filePath) || '裂缝图片',
      src,
      width,
      height,
    })
    ElMessage.success('裂缝图片已导入')
  }
  catch (error) {
    console.error('Failed to import fracture image:', error)
    ElMessage.error('导入裂缝图片失败')
  }
}

async function openFractureLibrary(trackId: string) {
  fractureLibraryTargetTrackId.value = trackId
  fractureLibraryVisible.value = true
  fractureLibraryLoading.value = true
  selectedFractureLibraryChartId.value = null
  try {
    const charts = await chartApi.listCharts(workareaStore.path, 'fracture_image')
    const details = await Promise.all(charts.map(chart => chartApi.getChart(workareaStore.path, chart.id).catch(() => null)))
    fractureLibraryItems.value = details
      .map(detail => detail ? parseStoredFractureChart(detail) : null)
      .filter((item): item is {
        id: number
        name: string
        thumbnail: string
        src: string
        width: number
        height: number
      } => item !== null)
    selectedFractureLibraryChartId.value = fractureLibraryItems.value[0]?.id || null
  }
  catch (error) {
    console.error('Failed to load fracture image library:', error)
    fractureLibraryItems.value = []
    ElMessage.error('加载成果集图片失败')
  }
  finally {
    fractureLibraryLoading.value = false
  }
}

async function confirmFractureLibraryImport() {
  const trackId = fractureLibraryTargetTrackId.value
  const item = fractureLibraryItems.value.find(entry => entry.id === selectedFractureLibraryChartId.value)
  if (!trackId || !item) {
    ElMessage.warning('请选择要导入的成果图')
    return
  }
  try {
    await appendFractureImageToTrack(trackId, item)
    fractureLibraryVisible.value = false
    ElMessage.success('成果集图片已导入到裂缝道')
  }
  catch (error) {
    console.error('Failed to import stored fracture image:', error)
    ElMessage.error('导入成果集图片失败')
  }
}

function removeFractureImage(trackId: string, imageId: string) {
  updateTrack(trackId, track => ({
    ...track,
    fractureImages: (track.fractureImages || []).filter(image => image.id !== imageId),
  }))
  if (selectedFractureImage.value?.trackId === trackId && selectedFractureImage.value.imageId === imageId) {
    selectedFractureImage.value = null
  }
}

function onSelectedFractureImageField(imageId: string, field: 'name' | 'opacity', value: unknown) {
  if (!selectedTrack.value || selectedTrack.value.type !== 'fracture') {
    return
  }
  if (field === 'name' && typeof value === 'string') {
    updateFractureImage(selectedTrack.value.id, imageId, { name: value })
  }
  if (field === 'opacity' && typeof value === 'number' && Number.isFinite(value)) {
    updateFractureImage(selectedTrack.value.id, imageId, { opacity: value })
  }
}

async function saveFractureImageToLibrary(trackId: string, imageId: string) {
  const track = config.value.tracks.find(item => item.id === trackId)
  const image = track?.fractureImages?.find(item => item.id === imageId)
  if (!image) {
    return
  }
  try {
    const { width, height } = await loadImageDimensions(image.src)
    const thumbnail = await createImageThumbnail(image.src)
    await chartApi.saveChart(
      workareaStore.path,
      image.name || '裂缝图片',
      'fracture_image',
      thumbnail || image.src,
      JSON.stringify({
        kind: 'fracture_image',
        name: image.name || '裂缝图片',
        src: image.src,
        width,
        height,
      }),
    )
    ElMessage.success('已保存到成果集')
  }
  catch (error) {
    console.error('Failed to save fracture image:', error)
    ElMessage.error('保存到成果集失败')
  }
}

function clearSelectedCurvePoints() {
  selectedCurvePoints.value = []
}

function roundDepthValue(depth: number): number {
  return Math.round(depth * 10) / 10
}

function getMedian(values: number[]): number | null {
  if (!values.length) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function trimExtremes(values: number[]): number[] {
  if (values.length < 3) {
    return [...values]
  }
  const sorted = [...values].sort((a, b) => a - b)
  const trimCount = Math.min(Math.floor(sorted.length * 0.1), Math.floor((sorted.length - 1) / 2))
  return trimCount > 0 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted
}

function getActiveCurveNames(tracks: TrackConfig[]): string[] {
  const names = new Set<string>()
  for (const track of tracks) {
    for (const curve of track.curves || []) {
      if (curve.curveName) {
        names.add(curve.curveName)
      }
    }
    for (const mineral of track.mineralCurves || []) {
      if (mineral.curveName) {
        names.add(mineral.curveName)
      }
    }
  }
  return [...names]
}

function computeCurveClusterDepthRange(tracks: TrackConfig[]): { min: number, max: number } | null {
  const topDepths: number[] = []
  const bottomDepths: number[] = []
  for (const curveName of getActiveCurveNames(tracks)) {
    const points = logData.value.curveData[curveName]
      ?.filter(point => point.value !== null && point.value !== -9999)
    if (!points?.length) {
      continue
    }
    topDepths.push(points[0].depth)
    bottomDepths.push(points[points.length - 1].depth)
  }

  if (!topDepths.length || !bottomDepths.length) {
    return null
  }

  const trimmedTopMedian = getMedian(trimExtremes(topDepths))
  const trimmedBottomMedian = getMedian(trimExtremes(bottomDepths))
  let min = trimmedTopMedian ?? Math.min(...topDepths)
  let max = trimmedBottomMedian ?? Math.max(...bottomDepths)

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    min = Math.min(...topDepths)
    max = Math.max(...bottomDepths)
  }
  if (max <= min) {
    return null
  }

  const span = Math.max(max - min, 10)
  const padding = Math.max(span * 0.1, 5)
  return {
    min: Math.max(0, roundDepthValue(min - padding)),
    max: roundDepthValue(max + padding),
  }
}

async function handleSelectionComplete(trackIdOrRect: string | SelectionRect, maybeRect?: SelectionRect) {
  if (!renderer || !config.value.wellName) {
    selectionRect.value = null
    return
  }

  const rect = typeof trackIdOrRect === 'string' ? maybeRect : trackIdOrRect
  const legacyTrackId = typeof trackIdOrRect === 'string' ? trackIdOrRect : null
  if (!rect) {
    selectionRect.value = null
    return
  }

  const left = Math.min(rect.x1, rect.x2)
  const right = Math.max(rect.x1, rect.x2)
  const top = Math.min(rect.y1, rect.y2)
  const bottom = Math.max(rect.y1, rect.y2)
  selectionRect.value = null

  if (right - left < 3 || bottom - top < 3) {
    clearSelectedCurvePoints()
    scheduleRender()
    return
  }

  const collectCurvePoints = renderer.collectCurvePointsInRect.bind(renderer) as (...args: any[]) => SelectedCurvePoint[]
  const points = legacyTrackId && collectCurvePoints.length >= 2
    ? collectCurvePoints(legacyTrackId, rect)
    : collectCurvePoints(rect)
  selectedCurvePoints.value = points
  emitCompositeLogDebug({
    channel: 'selection',
    event: 'selection-complete',
    payload: {
      rect: {
        x1: Math.round(rect.x1),
        y1: Math.round(rect.y1),
        x2: Math.round(rect.x2),
        y2: Math.round(rect.y2),
      },
      pointCount: points.length,
      pointsPreview: points.slice(0, 5).map(point => ({
        trackId: point.trackId,
        curveName: point.curveName,
        depth: point.depth,
        value: point.value,
      })),
    },
  })
  scheduleRender()

  if (!points.length) {
    ElMessage.info('框选区域内没有可删除的点')
    return
  }
  ElMessage.success(`已框选 ${points.length} 个点，右键可复制或删除`)
}

async function deleteSelectedCurvePoints() {
  if (!config.value.wellName || !selectedCurvePoints.value.length) {
    return
  }
  closeCtxMenu()

  const grouped = new Map<string, Set<number>>()
  for (const point of selectedCurvePoints.value) {
    if (!grouped.has(point.curveName)) {
      grouped.set(point.curveName, new Set())
    }
    grouped.get(point.curveName)!.add(point.depth)
  }

  const items = [...grouped.entries()].map(([curve_name, depths]) => ({
    curve_name,
    depths: [...depths],
  }))

  try {
    const deletedCount = await wellApi.deleteCurvePoints(config.value.wellName, workareaStore.path, items)
    await refreshCurveData()
    clearSelectedCurvePoints()
    scheduleRender()
    ElMessage.success(`已删除 ${deletedCount} 个点`)
  }
  catch (error) {
    console.error('Failed to delete curve points:', error)
    ElMessage.error('删除曲线点失败')
  }
}

function formatTableNumber(value: number): string {
  const rounded = Math.round(value * 1000000) / 1000000
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function buildSelectedCurvePointsTable(): string {
  const trackTitles = new Map(config.value.tracks.map(track => [track.id, track.title]))
  const lines = ['道\t曲线\t深度\t数值']
  for (const point of selectedCurvePoints.value) {
    lines.push([
      trackTitles.get(point.trackId) || '',
      point.curveName,
      formatTableNumber(point.depth),
      formatTableNumber(point.value),
    ].join('\t'))
  }
  return lines.join('\n')
}

async function writeTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('copy failed')
  }
}

async function copySelectedCurvePoints() {
  if (!selectedCurvePoints.value.length) {
    return
  }

  try {
    await writeTextToClipboard(buildSelectedCurvePointsTable())
    closeCtxMenu()
    ElMessage.success(`已复制 ${selectedCurvePoints.value.length} 个点`)
  }
  catch (error) {
    console.error('Failed to copy selected curve points:', error)
    ElMessage.error('复制曲线点失败')
  }
}

async function confirmDeleteSelectedCurvePoints() {
  if (!selectedCurvePoints.value.length) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `已框选 ${selectedCurvePoints.value.length} 个曲线点，是否删除？`,
      '删除曲线点',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteSelectedCurvePoints()
  }
  catch {
    // user cancelled
  }
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
watch(selectedTrackId, (trackId) => {
  if (selectedFractureImage.value && selectedFractureImage.value.trackId !== trackId) {
    selectedFractureImage.value = null
  }
  scheduleRender()
})

// ── Well selection ──
async function onWellChange(wellName: string) {
  clearSelectedCurvePoints()
  selectionRect.value = null
  selectedFractureImage.value = null
  if (!wellName) {
    config.value = { ...config.value, wellName: '', tracks: [] }
    logData.value = { curveData: {}, layers: [], lithology: [], interpretations: [] }
    return
  }

  const wp = workareaStore.path
  try {
    // Load continuous curve list + discrete curve names in parallel
    await loadCurveList(wellName)

    const [layers, lithology, interpretations] = await Promise.all([
      wellApi.getLayers(wellName, wp).catch(() => []),
      wellApi.getLithology(wellName, wp).catch(() => []),
      wellApi.getInterpretation(wellName, wp).catch(() => []),
    ])

    logData.value = { curveData: {}, layers, lithology, interpretations }

    let depthMin = 0
    let depthMax = 3000
    const fallbackDepths: number[] = []
    for (const l of layers) {
      fallbackDepths.push(l.top_depth, l.bottom_depth)
    }
    for (const li of lithology) {
      fallbackDepths.push(li.top_depth, li.bottom_depth)
    }
    for (const interp of interpretations) {
      fallbackDepths.push(interp.top_depth, interp.bottom_depth)
    }
    if (fallbackDepths.length > 0) {
      depthMin = Math.max(0, Math.min(...fallbackDepths) - 20)
      depthMax = Math.max(...fallbackDepths) + 20
    }

    const keepTracks = normalizeTracksCurveStyles(config.value.tracks)
    config.value = {
      wellName,
      title: `${wellName} 综合柱状图`,
      depthRange: { min: depthMin, max: depthMax },
      scale: 200,
      tracks: keepTracks,
    }

    await refreshCurveData()

    const curveRange = computeCurveClusterDepthRange(keepTracks)
    if (curveRange) {
      config.value = { ...config.value, depthRange: curveRange }
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
  const suggestedTracks = normalizeTracksCurveStyles(createSuggestedTracks(curveNames))
  config.value = { ...config.value, tracks: suggestedTracks }
  await refreshCurveData()
  const curveRange = computeCurveClusterDepthRange(suggestedTracks)
  if (curveRange) {
    config.value = { ...config.value, depthRange: curveRange }
  }
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
    // Load continuous curves and discrete curves in parallel
    const [contData, discData] = await Promise.all([
      wellApi.getCurveData(config.value.wellName, workareaStore.path, [...curveNames]),
      wellApi.getDiscreteCurves(config.value.wellName, workareaStore.path),
    ])
    // Merge: discrete curves fill in any names not found in continuous data
    const merged = { ...logData.value.curveData, ...contData }
    for (const [name, points] of Object.entries(discData)) {
      if (curveNames.has(name) && (!merged[name] || merged[name].length === 0)) {
        merged[name] = points
      }
    }
    logData.value = { ...logData.value, curveData: merged }
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
    onSelectionRectChange: (rect: SelectionRect | null) => {
      selectionRect.value = rect
    },
    onSelectionComplete: (...args: [SelectionRect] | [string, SelectionRect]) => {
      void handleSelectionComplete(args[0] as string | SelectionRect, args[1] as SelectionRect | undefined)
    },
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
    onFractureImageSelect: (trackId: string | null, imageId: string | null) => {
      if (trackId && imageId) {
        selectFractureImage(trackId, imageId)
      }
      else {
        selectedFractureImage.value = null
      }
    },
    onFractureImageChange: (trackId, imageId, next) => {
      updateFractureImage(trackId, imageId, next)
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
  selectionRect.value = null
  clearSelectedCurvePoints()
  selectedFractureImage.value = null
  removeDebugListener?.()
  removeDebugListener = null
}

onBeforeUnmount(destroyCanvas)

removeDebugListener = addCompositeLogDebugListener((entry) => {
  debugEntries.value = [entry, ...debugEntries.value].slice(0, 10)
})

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
  renderer.setSelectionRect(selectionRect.value)
  renderer.setSelectedCurvePoints(selectedCurvePoints.value)
  if ('setSelectedFractureImage' in renderer && typeof renderer.setSelectedFractureImage === 'function') {
    renderer.setSelectedFractureImage(selectedFractureImage.value)
  }
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
    selectedFractureImage.value = null
    config.value = { ...parsed, tracks: normalizeTracksCurveStyles(parsed.tracks || []) }
    if (parsed.wellName) {
      await loadCurveList(parsed.wellName)
      const [layers, lithology, interpretations] = await Promise.all([
        wellApi.getLayers(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getLithology(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getInterpretation(parsed.wellName, workareaStore.path).catch(() => []),
      ])
      logData.value = { curveData: {}, layers, lithology, interpretations }
      await refreshCurveData()
      const curveRange = computeCurveClusterDepthRange(config.value.tracks)
      if (curveRange) {
        config.value = { ...config.value, depthRange: curveRange }
      }
    }
    ElMessage.success(`已加载: ${chart.name}`)
  }
  catch { ElMessage.error('加载失败') }
}

async function loadSavedChart(chartId: number) {
  try {
    const chart = await chartApi.getChart(workareaStore.path, chartId)
    const parsed = JSON.parse(chart.config) as CompositeLogConfig
    selectedFractureImage.value = null
    config.value = { ...parsed, tracks: normalizeTracksCurveStyles(parsed.tracks || []) }
    if (parsed.wellName) {
      await loadCurveList(parsed.wellName)
      const [layers, lithology, interpretations] = await Promise.all([
        wellApi.getLayers(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getLithology(parsed.wellName, workareaStore.path).catch(() => []),
        wellApi.getInterpretation(parsed.wellName, workareaStore.path).catch(() => []),
      ])
      logData.value = { curveData: {}, layers, lithology, interpretations }
      await refreshCurveData()
      const curveRange = computeCurveClusterDepthRange(config.value.tracks)
      if (curveRange) {
        config.value = { ...config.value, depthRange: curveRange }
      }
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
  if (selectedFractureImage.value?.trackId === ctxMenu.value.track.id) {
    selectedFractureImage.value = null
  }
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
    curves[0] = { ...cs, fill: { color: cs.color, direction: 'left', customColor: false, opacity: 1 } }
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
  const track: TrackConfig = { id: nextTrackId(), type: 'interpretation', title: '解释结论', width: 96, visible: true }
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  closeCtxMenu()
}

function ctxAddFractureTrack() {
  const track = createFractureTrack()
  config.value = { ...config.value, tracks: [...config.value.tracks, track] }
  selectedTrackId.value = track.id
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

async function ctxImportFractureImage() {
  if (!ctxMenu.value.track || ctxMenu.value.track.type !== 'fracture') {
    return
  }
  const trackId = ctxMenu.value.track.id
  selectedTrackId.value = trackId
  closeCtxMenu()
  await importFractureImageToTrack(trackId)
}

function ctxImportFractureFromLibrary() {
  if (!ctxMenu.value.track || ctxMenu.value.track.type !== 'fracture') {
    return
  }
  const trackId = ctxMenu.value.track.id
  selectedTrackId.value = trackId
  closeCtxMenu()
  void openFractureLibrary(trackId)
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
      <el-popover placement="bottom" :width="320" trigger="click">
        <template #reference>
          <el-button size="small">
            网格
          </el-button>
        </template>
        <div class="grid-cfg">
          <div class="grid-cfg-row">
            <el-switch
              :model-value="gridConfig.enabled"
              size="small"
              active-text="显示网格"
              @change="onGridFieldChange('enabled', $event)"
            />
          </div>
          <template v-if="gridConfig.enabled">
            <div class="grid-cfg-title">
              主网格线
            </div>
            <div class="grid-cfg-row">
              <span class="grid-cfg-label">等分:</span>
              <el-input-number
                :model-value="gridConfig.majorInterval"
                size="small"
                :min="2" :max="20" :step="1"
                controls-position="right"
                style="width: 72px"
                @change="onGridFieldChange('majorInterval', $event)"
              />
              <span class="grid-cfg-label">色:</span>
              <el-color-picker
                :model-value="gridConfig.majorColor"
                size="small"
                @change="onGridFieldChange('majorColor', $event)"
              />
              <span class="grid-cfg-label">宽:</span>
              <el-input-number
                :model-value="gridConfig.majorWidth"
                size="small"
                :min="0.1" :max="3" :step="0.1"
                controls-position="right"
                style="width: 64px"
                @change="onGridFieldChange('majorWidth', $event)"
              />
            </div>
            <div class="grid-cfg-title">
              次网格线
            </div>
            <div class="grid-cfg-row">
              <span class="grid-cfg-label">等分:</span>
              <el-input-number
                :model-value="gridConfig.minorInterval"
                size="small"
                :min="0" :max="10" :step="1"
                controls-position="right"
                style="width: 72px"
                @change="onGridFieldChange('minorInterval', $event)"
              />
              <span class="grid-cfg-label">色:</span>
              <el-color-picker
                :model-value="gridConfig.minorColor"
                size="small"
                @change="onGridFieldChange('minorColor', $event)"
              />
              <span class="grid-cfg-label">宽:</span>
              <el-input-number
                :model-value="gridConfig.minorWidth"
                size="small"
                :min="0.1" :max="2" :step="0.1"
                controls-position="right"
                style="width: 64px"
                @change="onGridFieldChange('minorWidth', $event)"
              />
            </div>
          </template>
        </div>
      </el-popover>
      <el-divider direction="vertical" />
      <el-button size="small" @click="applySuggestedLayout">
        推荐布局
      </el-button>
      <el-button size="small" :icon="Download" @click="exportPng">
        导出
      </el-button>
      <div class="toolbar-spacer" />
      <span class="toolbar-info">
        竖拖移轴 / 斜拖框选 / 裂缝图拖拽缩放 |
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
        <template v-else-if="selectedTrack.type === 'fracture'">
          <el-button size="small" @click="importFractureImageToTrack(selectedTrack.id)">
            本地图片
          </el-button>
          <el-button size="small" @click="openFractureLibrary(selectedTrack.id)">
            成果集图片
          </el-button>
        </template>
        <el-button size="small" type="danger" plain @click="onDeleteSelected">
          删除道
        </el-button>
        <el-button size="small" plain @click="selectedTrackId = null">
          取消选择
        </el-button>
      </div>

      <template v-if="selectedTrack.type === 'fracture'">
        <div class="prop-row">
          <span class="prop-label">说明:</span>
          <span class="fracture-hint">图片仅在裂缝道内显示，可直接拖动和拖角点缩放</span>
        </div>
        <div v-if="selectedTrack.fractureImages?.length">
          <div
            v-for="image in selectedTrack.fractureImages"
            :key="image.id"
            class="prop-row fracture-row"
            :class="{ 'fracture-row-active': selectedFractureImage?.trackId === selectedTrack.id && selectedFractureImage?.imageId === image.id }"
          >
            <el-button
              size="small"
              :type="selectedFractureImage?.trackId === selectedTrack.id && selectedFractureImage?.imageId === image.id ? 'primary' : 'default'"
              @click="selectFractureImage(selectedTrack.id, image.id)"
            >
              选中
            </el-button>
            <el-input
              :model-value="image.name"
              size="small"
              style="width: 140px"
              @change="onSelectedFractureImageField(image.id, 'name', $event)"
            />
            <span class="prop-label">透明:</span>
            <el-input-number
              :model-value="image.opacity ?? 1"
              size="small"
              :min="0.1"
              :max="1"
              :step="0.1"
              controls-position="right"
              style="width: 86px"
              @change="onSelectedFractureImageField(image.id, 'opacity', $event)"
            />
            <span class="prop-label">{{ image.topDepth.toFixed(1) }}–{{ image.bottomDepth.toFixed(1) }}m</span>
            <el-button size="small" plain @click="saveFractureImageToLibrary(selectedTrack.id, image.id)">
              存成果
            </el-button>
            <el-button size="small" type="danger" plain @click="removeFractureImage(selectedTrack.id, image.id)">
              删除图片
            </el-button>
          </div>
        </div>
        <div v-else class="prop-row">
          <span class="fracture-hint">当前裂缝道还没有图片</span>
        </div>
      </template>

      <!-- Curve rows (for curve/discrete tracks) -->
      <template v-if="(selectedTrack.type === 'curve' || selectedTrack.type === 'discrete') && selectedTrack.curves?.length">
        <div v-for="(cs, ci) in selectedTrack.curves" :key="ci" class="prop-row curve-row">
          <span class="prop-label">曲线:</span>
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
          <span class="prop-label">颜色:</span>
          <el-popover placement="bottom" :width="280" trigger="click">
            <template #reference>
              <button
                type="button"
                class="curve-color-trigger"
                :style="getCurveColorPreviewStyle(cs)"
                :title="cs.valueColoring === false ? '单色显示' : '彩色显示'"
              />
            </template>
            <div class="curve-color-panel">
              <div class="curve-color-row">
                <span class="curve-color-label">彩色显示</span>
                <el-switch
                  :model-value="cs.valueColoring !== false"
                  size="small"
                  @change="onSelCurveColorModeChange(ci, $event)"
                />
              </div>
              <template v-if="cs.valueColoring !== false">
                <div class="curve-color-row">
                  <span class="curve-color-label">低值</span>
                  <el-color-picker
                    :model-value="cs.colorRamp?.low || DEFAULT_CURVE_COLOR_RAMP.low"
                    size="small"
                    @change="onSelCurveColorRampField(ci, 'low', $event)"
                  />
                  <span class="curve-color-label">中值</span>
                  <el-color-picker
                    :model-value="cs.colorRamp?.mid || DEFAULT_CURVE_COLOR_RAMP.mid"
                    size="small"
                    @change="onSelCurveColorRampField(ci, 'mid', $event)"
                  />
                </div>
                <div class="curve-color-row">
                  <span class="curve-color-label">高值</span>
                  <el-color-picker
                    :model-value="cs.colorRamp?.high || DEFAULT_CURVE_COLOR_RAMP.high"
                    size="small"
                    @change="onSelCurveColorRampField(ci, 'high', $event)"
                  />
                  <span class="curve-color-axis">
                    色轴: 低蓝 / 中黄 / 高红
                  </span>
                </div>
              </template>
              <div v-else class="curve-color-row">
                <span class="curve-color-label">线色</span>
                <el-color-picker
                  :model-value="cs.color"
                  size="small"
                  @change="onSelCurveField(ci, 'color', $event)"
                />
              </div>
            </div>
          </el-popover>
          <!-- Font style controls -->
          <span class="prop-label">字号:</span>
          <el-input-number
            :model-value="cs.fontSize || 9"
            size="small"
            :min="6" :max="20" :step="1"
            controls-position="right"
            style="width: 60px"
            @change="onSelCurveField(ci, 'fontSize', $event)"
          />
          <span class="prop-label">字色:</span>
          <el-color-picker
            :model-value="cs.fontColor || '#333333'"
            size="small"
            @change="onSelCurveField(ci, 'fontColor', $event)"
          />
          <el-button
            size="small"
            :type="cs.fontBold ? 'primary' : 'default'"
            style="font-weight: bold; min-width: 24px; padding: 0 4px; margin-left: 0"
            @click="onSelCurveField(ci, 'fontBold', !cs.fontBold)"
          >
            B
          </el-button>
          <el-button
            size="small"
            :type="cs.fontItalic ? 'primary' : 'default'"
            style="font-family: Georgia, serif; font-style: italic; min-width: 24px; padding: 0 4px; margin-left: 2px"
            @click="onSelCurveField(ci, 'fontItalic', !cs.fontItalic)"
          >
            I
          </el-button>
          <el-divider direction="vertical" />
          <span class="prop-label">线型:</span>
          <el-select
            :model-value="cs.lineStyle"
            size="small"
            style="width: 80px"
            @change="onSelCurveField(ci, 'lineStyle', $event)"
          >
            <el-option v-for="ls in LINE_STYLES" :key="ls.value" :value="ls.value" :label="ls.label">
              <span class="style-opt"><svg width="36" height="12"><line x1="0" y1="6" x2="36" y2="6" :stroke="getCurvePreviewStrokeColor(cs)" stroke-width="2" :stroke-dasharray="ls.dash" /></svg><span>{{ ls.label }}</span></span>
            </el-option>
          </el-select>
          <!-- Line width SVG -->
          <span class="prop-label">线宽:</span>
          <el-select
            :model-value="cs.lineWidth"
            size="small"
            style="width: 72px"
            @change="onSelCurveField(ci, 'lineWidth', $event)"
          >
            <el-option v-for="lw in LINE_WIDTHS" :key="lw" :value="lw" :label="`${lw}px`">
              <span class="style-opt"><svg width="32" height="12"><line x1="0" y1="6" x2="32" y2="6" :stroke="getCurvePreviewStrokeColor(cs)" :stroke-width="lw" /></svg><span>{{ lw }}px</span></span>
            </el-option>
          </el-select>
          <!-- Draw mode SVG -->
          <span class="prop-label">模式:</span>
          <el-select
            :model-value="cs.drawMode || 'line'"
            size="small"
            style="width: 80px"
            @change="onSelCurveField(ci, 'drawMode', $event)"
          >
            <el-option value="line" label="连线">
              <span class="style-opt"><svg width="24" height="12"><polyline points="0,10 6,3 12,8 18,1 24,5" fill="none" :stroke="getCurvePreviewStrokeColor(cs)" stroke-width="1.5" /></svg><span>连线</span></span>
            </el-option>
            <el-option value="bar" label="离散">
              <span class="style-opt"><svg width="24" height="12"><line x1="0" y1="2" x2="16" y2="2" :stroke="getCurvePreviewStrokeColor(cs)" stroke-width="1.5" /><line x1="0" y1="6" x2="10" y2="6" :stroke="getCurvePreviewStrokeColor(cs)" stroke-width="1.5" /><line x1="0" y1="10" x2="20" y2="10" :stroke="getCurvePreviewStrokeColor(cs)" stroke-width="1.5" /></svg><span>离散</span></span>
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
            <el-checkbox
              :model-value="cs.fill.customColor || false"
              size="small"
              @change="onSelFillCustomColorToggle(ci, $event as boolean)"
            >
              异色填充
            </el-checkbox>
            <el-color-picker
              v-if="cs.fill.customColor"
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
            <span class="prop-label">不透明:</span>
            <el-input-number
              :model-value="cs.fill.opacity ?? 1"
              size="small"
              :min="0"
              :max="1"
              :step="0.1"
              controls-position="right"
              style="width: 86px"
              @change="onSelFillField(ci, 'opacity', $event)"
            />
          </template>
          <el-button size="small" :icon="Delete" circle @click="onSelRemoveCurve(ci)" />
        </div>
      </template>
    </div>

    <!-- Canvas (full width, no sidebar) -->
    <div class="cl-body">
      <div ref="canvasContainer" class="cl-canvas-wrapper">
        <canvas ref="canvasRef" class="cl-canvas" />
        <div v-if="debugEntries.length" class="cl-debug-panel">
          <div class="cl-debug-title">
            前端调试
          </div>
          <div v-for="(entry, index) in debugEntries" :key="`${entry.timestamp}-${entry.channel}-${entry.event}-${index}`" class="cl-debug-item">
            <div class="cl-debug-meta">
              <span class="cl-debug-time">{{ entry.timestamp }}</span>
              <span class="cl-debug-channel">{{ entry.channel }}</span>
              <span class="cl-debug-event">{{ entry.event }}</span>
            </div>
            <div class="cl-debug-payload">
              {{ formatDebugPayload(entry.payload) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="fractureLibraryVisible"
      title="从成果集导入裂缝图片"
      width="760px"
      append-to-body
    >
      <div v-loading="fractureLibraryLoading" class="fracture-library">
        <div v-if="fractureLibraryItems.length" class="fracture-library-grid">
          <button
            v-for="item in fractureLibraryItems"
            :key="item.id"
            type="button"
            class="fracture-library-card"
            :class="{ 'fracture-library-card-active': selectedFractureLibraryChartId === item.id }"
            @click="selectedFractureLibraryChartId = item.id"
          >
            <div class="fracture-library-thumb">
              <img :src="item.thumbnail || item.src" :alt="item.name">
            </div>
            <div class="fracture-library-name">
              {{ item.name }}
            </div>
          </button>
        </div>
        <el-empty v-else description="成果集中暂无裂缝图片" />
      </div>
      <template #footer>
        <el-button @click="fractureLibraryVisible = false">
          取消
        </el-button>
        <el-button type="primary" @click="confirmFractureLibraryImport">
          导入
        </el-button>
      </template>
    </el-dialog>

    <!-- Context menu -->
    <div
      v-if="ctxMenu.visible"
      class="ctx-menu"
      :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
    >
      <template v-if="selectedCurvePoints.length">
        <div class="ctx-item" @click="copySelectedCurvePoints">
          复制已选点 ({{ selectedCurvePoints.length }})
        </div>
        <div class="ctx-item danger" @click="confirmDeleteSelectedCurvePoints">
          删除已选点 ({{ selectedCurvePoints.length }})
        </div>
        <div class="ctx-separator" />
      </template>
      <template v-else-if="ctxMenu.track?.type === 'fracture'">
        <div class="ctx-item" @click="ctxImportFractureImage">
          从本地导入裂缝图片
        </div>
        <div class="ctx-item" @click="ctxImportFractureFromLibrary">
          从成果集导入裂缝图片
        </div>
        <div class="ctx-item" @click="ctxSelectTrack">
          选中此道
        </div>
        <div class="ctx-item danger" @click="ctxRemoveTrack">
          删除此道
        </div>
      </template>
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
      <div class="ctx-item" @click="ctxAddFractureTrack">
        添加裂缝道
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
  user-select: none;
  -webkit-user-select: none;
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

.fracture-row {
  padding: 4px 0;
  border-top: 1px solid #eee;
}

.fracture-row-active {
  background: rgba(37, 99, 235, 0.06);
}

.fracture-hint {
  font-size: 12px;
  color: #64748b;
}

.style-opt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  svg { flex-shrink: 0; }
}

.curve-color-trigger {
  width: 28px;
  height: 20px;
  border: 1px solid #c0c4cc;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.curve-color-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curve-color-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.curve-color-label {
  min-width: 36px;
  font-size: 12px;
  color: #606266;
}

.curve-color-axis {
  font-size: 12px;
  color: #909399;
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
  user-select: none;
  -webkit-user-select: none;
}

.cl-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.cl-debug-panel {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: min(440px, calc(100% - 24px));
  max-height: 220px;
  overflow: auto;
  background: rgba(17, 24, 39, 0.88);
  color: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
  font-size: 11px;
  line-height: 1.45;
  pointer-events: none;
}

.cl-debug-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #fde68a;
}

.cl-debug-item {
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cl-debug-item:first-of-type {
  border-top: none;
  padding-top: 0;
}

.cl-debug-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.cl-debug-time {
  color: #cbd5e1;
}

.cl-debug-channel {
  color: #93c5fd;
  text-transform: uppercase;
}

.cl-debug-event {
  color: #fca5a5;
}

.cl-debug-payload {
  color: #e2e8f0;
  word-break: break-all;
  white-space: pre-wrap;
}

.fracture-library {
  min-height: 220px;
}

.fracture-library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.fracture-library-card {
  border: 1px solid #dbe2ea;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.fracture-library-card:hover {
  border-color: #60a5fa;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.fracture-library-card-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.fracture-library-thumb {
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fracture-library-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fracture-library-name {
  margin-top: 8px;
  font-size: 13px;
  color: #334155;
  word-break: break-all;
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

.grid-cfg {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grid-cfg-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grid-cfg-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.grid-cfg-title {
  font-size: 11px;
  color: #999;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 2px;
  margin-top: 2px;
}
</style>
