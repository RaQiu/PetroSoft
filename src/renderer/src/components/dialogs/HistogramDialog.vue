<template>
  <el-dialog
    v-model="dialogStore.histogramVisible"
    title="直方图"
    width="900px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="histogram-layout">
      <div class="histogram-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">选择井</div>
          <el-select v-model="selectedWell" placeholder="选择井" style="width: 100%" @change="onWellChange">
            <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">选择曲线</div>
          <el-select v-model="selectedCurve" placeholder="选择曲线" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">分箱数</div>
          <el-input-number v-model="bins" :min="5" :max="200" :step="5" style="width: 100%" />
        </div>
        <el-button type="primary" size="small" :loading="loading" :disabled="!canPlot" @click="plot">
          绘图
        </el-button>
        <div v-if="stats" class="stats-box">
          <div class="stats-title">统计信息</div>
          <div class="stats-row"><span>数据量:</span><span>{{ stats.count }}</span></div>
          <div class="stats-row"><span>均值:</span><span>{{ stats.mean.toFixed(4) }}</span></div>
          <div class="stats-row"><span>中位数:</span><span>{{ stats.median.toFixed(4) }}</span></div>
          <div class="stats-row"><span>标准差:</span><span>{{ stats.stdDev.toFixed(4) }}</span></div>
          <div class="stats-row"><span>最小值:</span><span>{{ stats.min.toFixed(4) }}</span></div>
          <div class="stats-row"><span>最大值:</span><span>{{ stats.max.toFixed(4) }}</span></div>
        </div>
      </div>
      <div class="histogram-chart">
        <v-chart v-if="chartOption" :option="chartOption" autoresize style="width: 100%; height: 100%" />
        <el-empty v-else description="选择井和曲线后点击绘图" />
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogStore.histogramVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellCurves, getCurveData } from '@/api/well'
import { computeHistogram, computeStats } from '@/utils/statistics'
import type { CurveInfo } from '@/types/well'
import type { StatsResult } from '@/utils/statistics'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

const selectedWell = ref('')
const selectedCurve = ref('')
const availableCurves = ref<CurveInfo[]>([])
const bins = ref(30)
const loading = ref(false)
const chartOption = ref<Record<string, unknown> | null>(null)
const stats = ref<StatsResult | null>(null)

const canPlot = computed(() => selectedWell.value && selectedCurve.value)

watch(
  () => dialogStore.histogramVisible,
  (visible) => {
    if (visible && workareaStore.isOpen) {
      wellStore.fetchWells(workareaStore.path)
    }
  }
)

async function onWellChange(wellName: string) {
  selectedCurve.value = ''
  chartOption.value = null
  stats.value = null
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function plot() {
  if (!selectedWell.value || !selectedCurve.value) return
  loading.value = true
  try {
    const data = await getCurveData(selectedWell.value, workareaStore.path, [selectedCurve.value])
    const points = data[selectedCurve.value] || []
    const values = points.map((p) => p.value).filter((v): v is number => v !== null)

    if (values.length === 0) {
      chartOption.value = null
      stats.value = null
      return
    }

    const histogram = computeHistogram(values, bins.value)
    stats.value = computeStats(values)

    chartOption.value = {
      tooltip: { trigger: 'axis' },
      grid: { left: '10%', right: '5%', top: '10%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: histogram.map((b) => `${b.min.toFixed(2)}`),
        name: selectedCurve.value,
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      yAxis: { type: 'value', name: '频次' },
      series: [{
        type: 'bar',
        data: histogram.map((b) => b.count),
        itemStyle: { color: '#409eff' }
      }]
    }
  } catch {
    chartOption.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.histogram-layout { display: flex; height: 550px; gap: 12px; }
.histogram-sidebar {
  width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px; overflow-y: auto;
}
.sidebar-section { display: flex; flex-direction: column; gap: 6px; }
.sidebar-label { font-size: 13px; font-weight: 600; color: #303133; }
.histogram-chart { flex: 1; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
.stats-box {
  border: 1px solid #e4e7ed; border-radius: 4px; padding: 8px; font-size: 12px;
  background: #fafafa;
}
.stats-title { font-weight: 600; margin-bottom: 6px; color: #303133; }
.stats-row { display: flex; justify-content: space-between; line-height: 1.8; color: #606266; }
</style>
