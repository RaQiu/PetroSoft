<template>
  <el-dialog
    v-model="dialogStore.histogramVisible"
    title="直方图"
    width="900px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="histogram-layout">
      <!-- Left: Well/Curve selection -->
      <div class="histogram-sidebar">
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
          <div class="sidebar-label">选择曲线</div>
          <el-select v-model="selectedCurve" placeholder="选择曲线" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Z轴着色</div>
          <el-select v-model="colorMode" style="width: 100%">
            <el-option label="按井着色" value="well" />
            <el-option label="不着色" value="none" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">分箱数</div>
          <el-input-number v-model="bins" :min="5" :max="200" :step="5" style="width: 100%" />
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">显示模式</div>
          <el-select v-model="displayMode" style="width: 100%">
            <el-option label="频次" value="count" />
            <el-option label="百分比" value="percent" />
            <el-option label="累积" value="cumulative" />
          </el-select>
        </div>
        <div class="sidebar-section method-info">
          <span>异常值: {{ currentMethodLabel }}</span>
        </div>
        <div class="sidebar-buttons">
          <el-button type="primary" size="small" :loading="loading" :disabled="!canPlot" @click="plot">
            绘图
          </el-button>
          <el-button size="small" :disabled="!chartOption" @click="exportImage">
            导出图片
          </el-button>
          <el-button size="small" type="success" :disabled="!chartOption" @click="saveAsResult">
            保存成果图
          </el-button>
        </div>
      </div>

      <!-- Center: Chart -->
      <div class="histogram-chart">
        <v-chart
          v-if="chartOption"
          ref="chartRef"
          :option="chartOption"
          autoresize
          style="width: 100%; height: 100%"
        />
        <el-empty v-else description="选择井和曲线后点击绘图" />
      </div>

      <!-- Right: Stats panel -->
      <div v-if="allStats.length > 0" class="histogram-stats">
        <div class="stats-title">统计信息{{ uiStore.outlierMethod !== 'none' ? '（去异常后）' : '' }}</div>
        <div v-for="s in allStats" :key="s.well" class="stats-block">
          <div v-if="allStats.length > 1" class="stats-well-name">{{ s.well }}</div>
          <div class="stats-row"><span>数据量:</span><span>{{ s.count }}</span></div>
          <div v-if="s.removed > 0" class="stats-row removed">
            <span>去除:</span><span>{{ s.removed }} 个</span>
          </div>
          <div class="stats-row"><span>均值:</span><span>{{ s.mean.toFixed(4) }}</span></div>
          <div class="stats-row"><span>中位数:</span><span>{{ s.median.toFixed(4) }}</span></div>
          <div class="stats-row"><span>标准差:</span><span>{{ s.stdDev.toFixed(4) }}</span></div>
          <div class="stats-row"><span>最小值:</span><span>{{ s.min.toFixed(4) }}</span></div>
          <div class="stats-row"><span>最大值:</span><span>{{ s.max.toFixed(4) }}</span></div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogStore.histogramVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { useUiStore } from '@/stores/ui'
import { getWellCurves, getCurveData } from '@/api/well'
import { saveChart } from '@/api/chart'
import { computeHistogram, computeStats } from '@/utils/statistics'
import { OUTLIER_METHODS, computeClipRange, clipValues } from '@/utils/outliers'
import type { StatsResult } from '@/utils/statistics'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const uiStore = useUiStore()

const selectedWells = ref<string[]>([])
const selectedCurve = ref('')
const availableCurves = ref<string[]>([])
const bins = ref(30)
const colorMode = ref('well')
const displayMode = ref('count')
const loading = ref(false)
const chartOption = ref<Record<string, unknown> | null>(null)
const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const allStats = ref<(StatsResult & { well: string; removed: number })[]>([])

const WELL_COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb', '#36cfc9', '#ff85c0']

const canPlot = computed(() => selectedWells.value.length > 0 && selectedCurve.value)

const currentMethodLabel = computed(() => {
  const m = OUTLIER_METHODS.find((m) => m.id === uiStore.outlierMethod)
  return m?.label ?? '不去除'
})

watch(
  () => dialogStore.histogramVisible,
  (visible) => {
    if (visible && workareaStore.isOpen) {
      selectedWells.value = []
      selectedCurve.value = ''
      availableCurves.value = []
      chartOption.value = null
      allStats.value = []
      bins.value = 30
      colorMode.value = 'well'
      displayMode.value = 'count'
      wellStore.fetchWells(workareaStore.path)
    }
  }
)

async function onWellsChange(wells: string[]) {
  selectedCurve.value = ''
  chartOption.value = null
  allStats.value = []
  if (wells.length === 0) { availableCurves.value = []; return }
  // Gather curves from all selected wells, keep intersection
  const curveSets: Set<string>[] = []
  for (const w of wells) {
    const curves = await getWellCurves(w, workareaStore.path)
    curveSets.push(new Set(curves.map(c => c.name)))
  }
  // Intersection of all curve sets
  if (curveSets.length === 0) { availableCurves.value = []; return }
  let common = curveSets[0]
  for (let i = 1; i < curveSets.length; i++) {
    common = new Set([...common].filter(x => curveSets[i].has(x)))
  }
  availableCurves.value = [...common].sort()
}

async function plot() {
  if (!canPlot.value) return
  loading.value = true
  try {
    const series: Record<string, unknown>[] = []
    const statsArr: (StatsResult & { well: string; removed: number })[] = []
    let globalLabels: string[] = []

    for (let wi = 0; wi < selectedWells.value.length; wi++) {
      const wellName = selectedWells.value[wi]
      const data = await getCurveData(wellName, workareaStore.path, [selectedCurve.value])
      const points = data[selectedCurve.value] || []
      const rawValues = points.map(p => p.value).filter((v): v is number => v !== null)
      if (rawValues.length === 0) continue

      const range = computeClipRange(rawValues, uiStore.outlierMethod)
      const values = clipValues(rawValues, range)
      const removed = rawValues.length - values.length
      if (values.length === 0) continue

      const histogram = computeHistogram(values, bins.value)
      const st = computeStats(values)
      statsArr.push({ ...st, well: wellName, removed })

      const labels = histogram.map(b => `${b.min.toFixed(2)}`)
      if (labels.length > globalLabels.length) globalLabels = labels

      let barData: number[]
      if (displayMode.value === 'percent') {
        const total = histogram.reduce((s, b) => s + b.count, 0)
        barData = histogram.map(b => total > 0 ? (b.count / total) * 100 : 0)
      } else if (displayMode.value === 'cumulative') {
        let cum = 0
        const total = histogram.reduce((s, b) => s + b.count, 0)
        barData = histogram.map(b => { cum += b.count; return total > 0 ? (cum / total) * 100 : 0 })
      } else {
        barData = histogram.map(b => b.count)
      }

      const color = colorMode.value === 'well' ? WELL_COLORS[wi % WELL_COLORS.length] : '#409eff'
      series.push({
        type: displayMode.value === 'cumulative' ? 'line' : 'bar',
        name: wellName,
        data: barData,
        itemStyle: { color },
        lineStyle: displayMode.value === 'cumulative' ? { color } : undefined,
        barGap: '10%'
      })
    }

    allStats.value = statsArr

    if (series.length === 0) { chartOption.value = null; return }

    const yName = displayMode.value === 'count' ? '频次' : displayMode.value === 'percent' ? '百分比(%)' : '累积百分比(%)'

    chartOption.value = {
      tooltip: { trigger: 'axis' },
      legend: selectedWells.value.length > 1 ? { top: 5 } : undefined,
      grid: { left: '10%', right: '5%', top: selectedWells.value.length > 1 ? '12%' : '8%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: globalLabels,
        name: selectedCurve.value,
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      yAxis: { type: 'value', name: yName },
      series
    }
  } catch {
    chartOption.value = null
  } finally {
    loading.value = false
  }
}

function exportImage() {
  if (!chartRef.value) return
  const chart = (chartRef.value as unknown as { chart: { getDataURL: (opts: Record<string, unknown>) => string } }).chart
  if (!chart) return
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = `histogram_${selectedCurve.value}.png`
  a.click()
}

async function saveAsResult() {
  if (!chartRef.value) return
  const chart = (chartRef.value as unknown as { chart: { getDataURL: (opts: Record<string, unknown>) => string } }).chart
  if (!chart) return
  try {
    const { value: name } = await ElMessageBox.prompt('请输入成果图名称', '保存成果图', {
      inputValue: `直方图_${selectedCurve.value}`,
      confirmButtonText: '保存',
      cancelButtonText: '取消'
    })
    if (!name) return
    const thumbnail = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    await saveChart(workareaStore.path, name, 'histogram', thumbnail, '{}')
    ElMessage.success('成果图已保存')
  } catch {
    // user cancelled
  }
}
</script>

<style scoped>
.histogram-layout { display: flex; height: 550px; gap: 12px; }
.histogram-sidebar {
  width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px; overflow-y: auto;
}
.sidebar-section { display: flex; flex-direction: column; gap: 6px; }
.sidebar-label { font-size: 13px; font-weight: 600; color: #303133; }
.sidebar-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.method-info { font-size: 12px; color: #909399; }
.histogram-chart { flex: 1; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
.histogram-stats {
  width: 180px; flex-shrink: 0; border: 1px solid #dcdfe6; border-radius: 4px;
  padding: 10px; font-size: 12px; overflow-y: auto; background: #fafafa;
}
.stats-title { font-weight: 600; margin-bottom: 8px; color: #303133; }
.stats-block { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #ebeef5; }
.stats-block:last-child { border-bottom: none; margin-bottom: 0; }
.stats-well-name { font-weight: 600; color: #409eff; margin-bottom: 4px; }
.stats-row { display: flex; justify-content: space-between; line-height: 1.8; color: #606266; }
.stats-row.removed { color: #e6a23c; font-weight: 500; }
</style>
