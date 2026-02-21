<template>
  <el-dialog
    v-model="dialogStore.wellCurveVisible"
    title="井曲线显示"
    width="1000px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div v-if="!workareaStore.isOpen" class="no-workarea">
      <el-empty description="请先打开工区" />
    </div>
    <div v-else class="curve-window">
      <div class="curve-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">选择井</div>
          <el-select v-model="selectedWellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
            <el-option
              v-for="w in wellStore.wells"
              :key="w.name"
              :label="w.name"
              :value="w.name"
            />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">选择曲线</div>
          <el-checkbox-group v-model="selectedCurves" @change="onCurveChange">
            <el-checkbox
              v-for="c in availableCurves"
              :key="c.name"
              :label="c.name"
              :value="c.name"
            >
              {{ c.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <el-button type="primary" size="small" :loading="loadingData" :disabled="!canPlot" @click="loadAndPlot">
          绘制曲线
        </el-button>
        <div class="method-info">
          <span>异常值: {{ currentMethodLabel }}</span>
        </div>
      </div>
      <div class="curve-chart-area">
        <v-chart
          v-if="chartOption"
          :option="chartOption"
          autoresize
          style="width: 100%; height: 100%"
        />
        <el-empty v-else description="选择井和曲线后点击绘制" />
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogStore.wellCurveVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption, LegendComponentOption, DataZoomComponentOption } from 'echarts/components'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { useUiStore } from '@/stores/ui'
import { getWellCurves, getCurveData } from '@/api/well'
import { OUTLIER_METHODS, computeClipRange } from '@/utils/outliers'
import type { ClipRange } from '@/utils/outliers'
import type { CurveInfo, CurveDataResponse } from '@/types/well'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

type ECOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption | DataZoomComponentOption
>

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const uiStore = useUiStore()

const selectedWellName = ref('')
const availableCurves = ref<CurveInfo[]>([])
const selectedCurves = ref<string[]>([])
const loadingData = ref(false)
const chartOption = ref<ECOption | null>(null)

const canPlot = computed(() => selectedWellName.value && selectedCurves.value.length > 0)

const currentMethodLabel = computed(() => {
  const m = OUTLIER_METHODS.find((m) => m.id === uiStore.outlierMethod)
  return m?.label ?? '不去除'
})

watch(
  () => dialogStore.wellCurveVisible,
  async (visible) => {
    if (visible && workareaStore.isOpen) {
      await wellStore.fetchWells(workareaStore.path)
      // Auto-select current well if available
      if (wellStore.selectedWell) {
        selectedWellName.value = wellStore.selectedWell.name
        await onWellChange(selectedWellName.value)
      }
    }
  }
)

async function onWellChange(wellName: string) {
  selectedCurves.value = []
  chartOption.value = null
  if (!wellName) {
    availableCurves.value = []
    return
  }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

function onCurveChange() {
  // Reset chart when curve selection changes
  chartOption.value = null
}

// Color palette for curves
const COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6',
  '#91cc75', '#fac858'
]

async function loadAndPlot() {
  if (!selectedWellName.value || selectedCurves.value.length === 0) return

  loadingData.value = true
  try {
    const data: CurveDataResponse = await getCurveData(
      selectedWellName.value,
      workareaStore.path,
      selectedCurves.value
    )

    buildChart(data)
  } catch {
    chartOption.value = null
  } finally {
    loadingData.value = false
  }
}

function buildChart(data: CurveDataResponse) {
  const curveNames = Object.keys(data)
  if (curveNames.length === 0) {
    chartOption.value = null
    return
  }

  // Each curve gets its own x-axis (top) and shared y-axis (depth, inverted)
  const grids: GridComponentOption[] = []
  const xAxes: Record<string, unknown>[] = []
  const yAxes: Record<string, unknown>[] = []
  const series: LineSeriesOption[] = []
  const dataZooms: DataZoomComponentOption[] = []

  const totalCurves = curveNames.length
  const gapPercent = 1
  const chartWidth = (100 - (totalCurves + 1) * gapPercent) / totalCurves

  curveNames.forEach((cname, i) => {
    const left = `${gapPercent + i * (chartWidth + gapPercent)}%`
    const width = `${chartWidth}%`

    grids.push({
      left,
      width,
      top: '8%',
      bottom: '12%'
    })

    xAxes.push({
      type: 'value',
      gridIndex: i,
      name: cname,
      nameLocation: 'middle',
      nameGap: 25,
      position: 'top',
      axisLabel: { fontSize: 10 },
      nameTextStyle: { fontSize: 11 }
    })

    yAxes.push({
      type: 'value',
      gridIndex: i,
      inverse: true,
      name: i === 0 ? '深度(m)' : '',
      axisLabel: { show: i === 0, fontSize: 10 },
      nameTextStyle: { fontSize: 11 }
    })

    const points = data[cname] || []
    const validPoints = points.filter((p) => p.value !== null)
    const values = validPoints.map((p) => p.value as number)
    const clipRange: ClipRange | null = computeClipRange(values, uiStore.outlierMethod)

    const filteredData = validPoints
      .filter((p) => !clipRange || (p.value! >= clipRange.min && p.value! <= clipRange.max))
      .map((p) => [p.value, p.depth])

    // Set axis range to clip range + 5% margin for better visual
    if (clipRange && filteredData.length > 0) {
      const margin = (clipRange.max - clipRange.min) * 0.05 || 0.1
      xAxes[i].min = clipRange.min - margin
      xAxes[i].max = clipRange.max + margin
    }

    series.push({
      name: cname,
      type: 'line',
      xAxisIndex: i,
      yAxisIndex: i,
      data: filteredData,
      symbol: 'none',
      lineStyle: { width: 1, color: COLORS[i % COLORS.length] },
      itemStyle: { color: COLORS[i % COLORS.length] }
    })
  })

  // Shared Y-axis dataZoom across all grids
  const yAxisIndices = curveNames.map((_, i) => i)
  dataZooms.push(
    {
      type: 'slider',
      yAxisIndex: yAxisIndices,
      right: 0,
      width: 20,
      start: 0,
      end: 100,
      filterMode: 'none'
    },
    {
      type: 'inside',
      yAxisIndex: yAxisIndices,
      filterMode: 'none'
    }
  )

  chartOption.value = {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: grids,
    xAxis: xAxes as never,
    yAxis: yAxes as never,
    series,
    dataZoom: dataZooms
  }
}
</script>

<style scoped lang="scss">
.no-workarea {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.curve-window {
  display: flex;
  height: 600px;
  gap: 12px;
}

.curve-sidebar {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.method-info {
  font-size: 12px;
  color: #909399;
}

.el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.curve-chart-area {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}
</style>
