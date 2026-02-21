<template>
  <el-dialog
    v-model="dialogStore.crossplotVisible"
    title="交会图"
    width="950px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="crossplot-layout">
      <div class="crossplot-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">选择井</div>
          <el-select v-model="selectedWell" placeholder="选择井" style="width: 100%" @change="onWellChange">
            <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">X轴曲线</div>
          <el-select v-model="xCurve" placeholder="选择X轴" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Y轴曲线</div>
          <el-select v-model="yCurve" placeholder="选择Y轴" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">颜色曲线（可选）</div>
          <el-select v-model="colorCurve" placeholder="按深度着色" clearable style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </div>
        <el-button type="primary" size="small" :loading="loading" :disabled="!canPlot" @click="plot">
          绘图
        </el-button>
      </div>
      <div class="crossplot-chart">
        <v-chart v-if="chartOption" :option="chartOption" autoresize style="width: 100%; height: 100%" />
        <el-empty v-else description="选择井和两条曲线后点击绘图" />
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogStore.crossplotVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellCurves, getCurveData } from '@/api/well'
import type { CurveInfo } from '@/types/well'

use([ScatterChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

const selectedWell = ref('')
const xCurve = ref('')
const yCurve = ref('')
const colorCurve = ref('')
const availableCurves = ref<CurveInfo[]>([])
const loading = ref(false)
const chartOption = ref<Record<string, unknown> | null>(null)

const canPlot = computed(() => selectedWell.value && xCurve.value && yCurve.value)

watch(
  () => dialogStore.crossplotVisible,
  (visible) => {
    if (visible && workareaStore.isOpen) {
      wellStore.fetchWells(workareaStore.path)
    }
  }
)

async function onWellChange(wellName: string) {
  xCurve.value = ''
  yCurve.value = ''
  colorCurve.value = ''
  chartOption.value = null
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function plot() {
  if (!canPlot.value) return
  loading.value = true
  try {
    const curveNames = [xCurve.value, yCurve.value]
    if (colorCurve.value && !curveNames.includes(colorCurve.value)) {
      curveNames.push(colorCurve.value)
    }

    const data = await getCurveData(selectedWell.value, workareaStore.path, curveNames)
    const xData = data[xCurve.value] || []
    const yData = data[yCurve.value] || []
    const cData = colorCurve.value ? (data[colorCurve.value] || []) : null

    // Build depth-indexed lookup
    const xMap = new Map(xData.map((p) => [p.depth, p.value]))
    const yMap = new Map(yData.map((p) => [p.depth, p.value]))
    const cMap = cData ? new Map(cData.map((p) => [p.depth, p.value])) : null

    const allDepths = new Set([...xMap.keys(), ...yMap.keys()])
    const points: number[][] = []
    let cMin = Infinity, cMax = -Infinity

    for (const d of allDepths) {
      const xv = xMap.get(d)
      const yv = yMap.get(d)
      if (xv == null || yv == null) continue
      if (cMap) {
        const cv = cMap.get(d)
        if (cv == null) continue
        points.push([xv, yv, cv])
        if (cv < cMin) cMin = cv
        if (cv > cMax) cMax = cv
      } else {
        points.push([xv, yv, d])
        if (d < cMin) cMin = d
        if (d > cMax) cMax = d
      }
    }

    const option: Record<string, unknown> = {
      tooltip: {
        formatter: (p: { value: number[] }) =>
          `${xCurve.value}: ${p.value[0].toFixed(3)}<br/>${yCurve.value}: ${p.value[1].toFixed(3)}<br/>${colorCurve.value || '深度'}: ${p.value[2].toFixed(3)}`
      },
      grid: { left: '12%', right: '18%', top: '8%', bottom: '12%' },
      xAxis: { type: 'value', name: xCurve.value },
      yAxis: { type: 'value', name: yCurve.value },
      visualMap: {
        min: cMin,
        max: cMax,
        dimension: 2,
        text: [colorCurve.value || '深度'],
        inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027'] },
        right: 10,
        top: 'center'
      },
      series: [{
        type: 'scatter',
        data: points,
        symbolSize: 4
      }]
    }

    chartOption.value = option
  } catch {
    chartOption.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.crossplot-layout { display: flex; height: 550px; gap: 12px; }
.crossplot-sidebar {
  width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px;
}
.sidebar-section { display: flex; flex-direction: column; gap: 6px; }
.sidebar-label { font-size: 13px; font-weight: 600; color: #303133; }
.crossplot-chart { flex: 1; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
</style>
