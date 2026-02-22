<template>
  <el-dialog
    v-model="dialogStore.crossplotVisible"
    title="交会图"
    width="95%"
    top="2vh"
    :close-on-click-modal="false"
  >
    <div class="crossplot-layout">
      <div class="crossplot-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">选择井</div>
          <el-select
            v-model="selectedWells"
            placeholder="选择井"
            style="width: 100%"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            @change="onWellsChange"
          >
            <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">X轴曲线</div>
          <el-select v-model="xCurve" placeholder="选择X轴" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Y轴曲线</div>
          <el-select v-model="yCurve" placeholder="选择Y轴" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">颜色曲线（可选）</div>
          <el-select v-model="colorCurve" placeholder="按深度着色" clearable style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="sidebar-section method-info">
          <span>异常值: {{ currentMethodLabel }}</span>
        </div>
        <div class="sidebar-buttons">
          <el-button type="primary" size="small" :loading="loading" :disabled="!canPlot" @click="plot">
            绘图
          </el-button>
          <el-button size="small" :disabled="!chartOption || !showFit" @click="toggleFit">
            {{ showFit ? '隐藏拟合' : '线性拟合' }}
          </el-button>
          <el-button size="small" :disabled="!chartOption" @click="exportImage">
            导出图片
          </el-button>
          <el-button size="small" type="success" :disabled="!chartOption" @click="saveAsResult">
            保存成果图
          </el-button>
        </div>
        <div v-if="plotInfo" class="stats-box">
          <div class="stats-title">绘图信息</div>
          <div class="stats-row"><span>数据点:</span><span>{{ plotInfo.total }}</span></div>
          <div v-if="plotInfo.removed > 0" class="stats-row removed">
            <span>去除异常:</span><span>{{ plotInfo.removed }} 点</span>
          </div>
        </div>
        <div v-if="fitResult" class="stats-box">
          <div class="stats-title">拟合结果</div>
          <div class="stats-row"><span>Y =</span><span>{{ fitResult.a.toFixed(4) }}X + {{ fitResult.b.toFixed(4) }}</span></div>
          <div class="stats-row"><span>R²:</span><span>{{ fitResult.r2.toFixed(4) }}</span></div>
        </div>
      </div>
      <div class="crossplot-main">
        <div class="crossplot-chart">
          <v-chart
            v-if="chartOption"
            ref="chartRef"
            :option="chartOption"
            autoresize
            style="width: 100%; height: 100%"
            @mousemove="onChartMouseMove"
          />
          <el-empty v-else description="选择井和两条曲线后点击绘图" />
        </div>
        <div class="crossplot-statusbar">
          <span v-if="mousePos">X: {{ mousePos.x.toFixed(4) }}  Y: {{ mousePos.y.toFixed(4) }}</span>
          <span v-else>移动鼠标查看坐标</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogStore.crossplotVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { ScatterChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { useUiStore } from '@/stores/ui'
import { getWellCurves, getCurveData } from '@/api/well'
import { saveChart } from '@/api/chart'
import { OUTLIER_METHODS, computeClipRange } from '@/utils/outliers'
import type { ClipRange } from '@/utils/outliers'

use([ScatterChart, LineChart, GridComponent, TooltipComponent, VisualMapComponent, LegendComponent, CanvasRenderer])

const WELL_COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0']

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const uiStore = useUiStore()

const selectedWells = ref<string[]>([])
const xCurve = ref('')
const yCurve = ref('')
const colorCurve = ref('')
const availableCurves = ref<string[]>([])
const loading = ref(false)
const chartOption = ref<Record<string, unknown> | null>(null)
const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const plotInfo = ref<{ total: number; removed: number } | null>(null)
const mousePos = ref<{ x: number; y: number } | null>(null)
const showFit = ref(false)
const fitResult = ref<{ a: number; b: number; r2: number } | null>(null)

// Store raw points for fit recalculation
const rawPlotPoints = ref<number[][]>([])
const rawAxisRanges = ref<{ xRange: ClipRange | null; yRange: ClipRange | null }>({ xRange: null, yRange: null })

const canPlot = computed(() => selectedWells.value.length > 0 && xCurve.value && yCurve.value)

const currentMethodLabel = computed(() => {
  const m = OUTLIER_METHODS.find((m) => m.id === uiStore.outlierMethod)
  return m?.label ?? '不去除'
})

watch(
  () => dialogStore.crossplotVisible,
  (visible) => {
    if (visible && workareaStore.isOpen) {
      selectedWells.value = []
      xCurve.value = ''
      yCurve.value = ''
      colorCurve.value = ''
      availableCurves.value = []
      chartOption.value = null
      plotInfo.value = null
      fitResult.value = null
      showFit.value = false
      mousePos.value = null
      rawPlotPoints.value = []
      wellStore.fetchWells(workareaStore.path)
    }
  }
)

async function onWellsChange(wells: string[]) {
  xCurve.value = ''
  yCurve.value = ''
  colorCurve.value = ''
  chartOption.value = null
  plotInfo.value = null
  fitResult.value = null
  showFit.value = false
  if (wells.length === 0) { availableCurves.value = []; return }
  const curveSets: Set<string>[] = []
  for (const w of wells) {
    const curves = await getWellCurves(w, workareaStore.path)
    curveSets.push(new Set(curves.map(c => c.name)))
  }
  if (curveSets.length === 0) { availableCurves.value = []; return }
  let common = curveSets[0]
  for (let i = 1; i < curveSets.length; i++) {
    common = new Set([...common].filter(x => curveSets[i].has(x)))
  }
  availableCurves.value = [...common].sort()
}

function inRange(v: number, range: ClipRange | null): boolean {
  if (!range) return true
  return v >= range.min && v <= range.max
}

function linearFit(points: number[][]): { a: number; b: number; r2: number } {
  const n = points.length
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0
  for (const [x, y] of points) {
    sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y
  }
  const denom = n * sxx - sx * sx
  if (Math.abs(denom) < 1e-15) return { a: 0, b: 0, r2: 0 }
  const a = (n * sxy - sx * sy) / denom
  const b = (sy - a * sx) / n
  const yMean = sy / n
  let ssTot = 0, ssRes = 0
  for (const [x, y] of points) {
    ssTot += (y - yMean) ** 2
    ssRes += (y - (a * x + b)) ** 2
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
  return { a, b, r2 }
}

async function plot() {
  if (!canPlot.value) return
  loading.value = true
  showFit.value = false
  fitResult.value = null
  try {
    const allPoints: number[][] = []
    const multiWell = selectedWells.value.length > 1
    const useColorCurve = !multiWell && colorCurve.value
    let totalValid = 0
    let removedByOutlier = 0
    let cMin = Infinity, cMax = -Infinity
    const seriesList: Record<string, unknown>[] = []

    for (let wi = 0; wi < selectedWells.value.length; wi++) {
      const wellName = selectedWells.value[wi]
      const curveNames = [xCurve.value, yCurve.value]
      if (useColorCurve && !curveNames.includes(colorCurve.value)) curveNames.push(colorCurve.value)

      const data = await getCurveData(wellName, workareaStore.path, curveNames)
      const xData = data[xCurve.value] || []
      const yData = data[yCurve.value] || []
      const cData = useColorCurve ? (data[colorCurve.value] || []) : null

      const xValues = xData.map(p => p.value).filter((v): v is number => v !== null)
      const yValues = yData.map(p => p.value).filter((v): v is number => v !== null)
      const xRange = computeClipRange(xValues, uiStore.outlierMethod)
      const yRange = computeClipRange(yValues, uiStore.outlierMethod)

      const xMap = new Map(xData.map(p => [p.depth, p.value]))
      const yMap = new Map(yData.map(p => [p.depth, p.value]))
      const cMap = cData ? new Map(cData.map(p => [p.depth, p.value])) : null

      const allDepths = new Set([...xMap.keys(), ...yMap.keys()])
      const wellPoints: number[][] = []

      for (const d of allDepths) {
        const xv = xMap.get(d)
        const yv = yMap.get(d)
        if (xv == null || yv == null) continue
        totalValid++
        if (!inRange(xv, xRange) || !inRange(yv, yRange)) { removedByOutlier++; continue }

        if (cMap) {
          const cv = cMap.get(d)
          if (cv == null) continue
          wellPoints.push([xv, yv, cv])
          if (cv < cMin) cMin = cv
          if (cv > cMax) cMax = cv
        } else {
          wellPoints.push([xv, yv, d])
          if (d < cMin) cMin = d
          if (d > cMax) cMax = d
        }
      }

      allPoints.push(...wellPoints.map(p => [p[0], p[1]]))

      if (multiWell) {
        seriesList.push({
          type: 'scatter',
          name: wellName,
          data: wellPoints,
          symbolSize: 4,
          itemStyle: { color: WELL_COLORS[wi % WELL_COLORS.length] }
        })
      } else {
        seriesList.push({
          type: 'scatter',
          name: wellName,
          data: wellPoints,
          symbolSize: 4
        })
      }

      rawAxisRanges.value = { xRange, yRange }
    }

    rawPlotPoints.value = allPoints
    plotInfo.value = { total: totalValid, removed: removedByOutlier }

    if (seriesList.length === 0 || allPoints.length === 0) {
      chartOption.value = null
      return
    }

    const xRange = rawAxisRanges.value.xRange
    const yRange = rawAxisRanges.value.yRange
    const xMargin = xRange ? (xRange.max - xRange.min) * 0.05 || 0.1 : 0
    const yMargin = yRange ? (yRange.max - yRange.min) * 0.05 || 0.1 : 0

    const option: Record<string, unknown> = {
      tooltip: {
        formatter: (p: { value: number[]; seriesName: string }) =>
          `${p.seriesName}<br/>${xCurve.value}: ${p.value[0]?.toFixed(3)}<br/>${yCurve.value}: ${p.value[1]?.toFixed(3)}`
      },
      legend: multiWell ? { top: 5 } : undefined,
      grid: { left: '12%', right: multiWell ? '5%' : '18%', top: multiWell ? '12%' : '8%', bottom: '12%' },
      xAxis: {
        type: 'value',
        name: xCurve.value,
        min: xRange ? xRange.min - xMargin : undefined,
        max: xRange ? xRange.max + xMargin : undefined
      },
      yAxis: {
        type: 'value',
        name: yCurve.value,
        min: yRange ? yRange.min - yMargin : undefined,
        max: yRange ? yRange.max + yMargin : undefined
      },
      series: seriesList
    }

    // Add visualMap only when single well with color curve
    if (!multiWell && cMin < Infinity) {
      option.visualMap = {
        min: cMin,
        max: cMax,
        dimension: 2,
        text: [colorCurve.value || '深度', ''],
        inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027'] },
        right: 10,
        top: 'center'
      }
    }

    chartOption.value = option
  } catch {
    chartOption.value = null
  } finally {
    loading.value = false
  }
}

function toggleFit() {
  if (!chartOption.value) return
  showFit.value = !showFit.value

  const option = { ...chartOption.value } as Record<string, unknown>
  let series = [...(option.series as Record<string, unknown>[])]

  // Remove existing fit line
  series = series.filter(s => (s as { name?: string }).name !== '__fit__')

  if (showFit.value && rawPlotPoints.value.length >= 2) {
    const fit = linearFit(rawPlotPoints.value)
    fitResult.value = fit

    const xs = rawPlotPoints.value.map(p => p[0])
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)

    series.push({
      type: 'line',
      name: '__fit__',
      data: [[xMin, fit.a * xMin + fit.b], [xMax, fit.a * xMax + fit.b]],
      lineStyle: { color: '#ff4444', width: 2, type: 'dashed' },
      symbol: 'none',
      tooltip: { show: false }
    })
  } else {
    fitResult.value = null
  }

  option.series = series
  chartOption.value = option
}

function onChartMouseMove(params: { event?: { offsetX?: number; offsetY?: number } }) {
  if (!chartRef.value || !params.event) return
  const chart = (chartRef.value as unknown as { chart: {
    containPixel: (gridId: string, point: number[]) => boolean
    convertFromPixel: (gridId: string, point: number[]) => number[]
  } }).chart
  if (!chart) return
  const { offsetX, offsetY } = params.event
  if (offsetX === undefined || offsetY === undefined) return
  try {
    if (chart.containPixel('grid', [offsetX, offsetY])) {
      const coord = chart.convertFromPixel('grid', [offsetX, offsetY])
      mousePos.value = { x: coord[0], y: coord[1] }
    }
  } catch {
    // ignore
  }
}

function exportImage() {
  if (!chartRef.value) return
  const chart = (chartRef.value as unknown as { chart: { getDataURL: (opts: Record<string, unknown>) => string } }).chart
  if (!chart) return
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = `crossplot_${xCurve.value}_${yCurve.value}.png`
  a.click()
}

async function saveAsResult() {
  if (!chartRef.value) return
  const chart = (chartRef.value as unknown as { chart: { getDataURL: (opts: Record<string, unknown>) => string } }).chart
  if (!chart) return
  try {
    const { value: name } = await ElMessageBox.prompt('请输入成果图名称', '保存成果图', {
      inputValue: `交会图_${xCurve.value}_${yCurve.value}`,
      confirmButtonText: '保存',
      cancelButtonText: '取消'
    })
    if (!name) return
    const thumbnail = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    await saveChart(workareaStore.path, name, 'crossplot', thumbnail, '{}')
    ElMessage.success('成果图已保存')
  } catch {
    // user cancelled
  }
}
</script>

<style scoped>
.crossplot-layout { display: flex; height: calc(90vh - 120px); gap: 12px; }
.crossplot-sidebar {
  width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px; overflow-y: auto;
}
.crossplot-main { flex: 1; display: flex; flex-direction: column; gap: 0; }
.crossplot-chart { flex: 1; border: 1px solid #dcdfe6; border-radius: 4px 4px 0 0; overflow: hidden; }
.crossplot-statusbar {
  height: 28px; background: #f5f7fa; border: 1px solid #dcdfe6; border-top: none;
  border-radius: 0 0 4px 4px; display: flex; align-items: center; padding: 0 12px;
  font-size: 12px; color: #606266; font-family: monospace;
}
.sidebar-section { display: flex; flex-direction: column; gap: 6px; }
.sidebar-label { font-size: 13px; font-weight: 600; color: #303133; }
.sidebar-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.method-info { font-size: 12px; color: #909399; }
.stats-box {
  border: 1px solid #e4e7ed; border-radius: 4px; padding: 8px; font-size: 12px;
  background: #fafafa;
}
.stats-title { font-weight: 600; margin-bottom: 6px; color: #303133; }
.stats-row { display: flex; justify-content: space-between; line-height: 1.8; color: #606266; }
.stats-row.removed { color: #e6a23c; font-weight: 500; }
</style>
