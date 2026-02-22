<template>
  <el-dialog
    v-model="dialogStore.seismicDisplayVisible"
    title="地震剖面显示"
    width="95%"
    top="2vh"
    :close-on-click-modal="false"
  >
    <div class="seismic-layout">
      <div class="seismic-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">数据体</div>
          <el-select v-model="selectedVolumeId" placeholder="选择数据体" style="width: 100%" @change="onVolumeChange">
            <el-option v-for="v in volumes" :key="v.id" :label="v.name" :value="v.id" />
          </el-select>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">方向</div>
          <el-radio-group v-model="direction" style="width: 100%">
            <el-radio-button value="inline">Inline</el-radio-button>
            <el-radio-button value="crossline">Crossline</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="selectedVolume" class="sidebar-section">
          <div class="sidebar-label">
            {{ direction === 'inline' ? 'Inline' : 'Crossline' }} 号
            <span class="range-hint">({{ rangeMin }}–{{ rangeMax }})</span>
          </div>
          <el-input-number
            v-model="lineIndex"
            :min="rangeMin"
            :max="rangeMax"
            :step="1"
            style="width: 100%"
          />
          <el-slider
            v-model="lineIndex"
            :min="rangeMin"
            :max="rangeMax"
            :step="1"
            style="margin-top: 4px"
          />
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">降采样</div>
          <el-select v-model="downsample" style="width: 100%">
            <el-option :value="1" label="原始 (1:1)" />
            <el-option :value="2" label="1:2" />
            <el-option :value="4" label="1:4" />
            <el-option :value="8" label="1:8" />
          </el-select>
        </div>

        <el-button type="primary" size="small" :loading="loading" :disabled="!canDisplay" @click="displaySection">
          显示
        </el-button>

        <div v-if="ampInfo" class="stats-box">
          <div class="stats-title">振幅信息</div>
          <div class="stats-row"><span>最小:</span><span>{{ ampInfo.min.toFixed(2) }}</span></div>
          <div class="stats-row"><span>最大:</span><span>{{ ampInfo.max.toFixed(2) }}</span></div>
          <div class="stats-row"><span>道数:</span><span>{{ ampInfo.traces }}</span></div>
          <div class="stats-row"><span>采样:</span><span>{{ ampInfo.samples }}</span></div>
        </div>
      </div>

      <div class="seismic-chart">
        <v-chart v-if="chartOption" :option="chartOption" autoresize style="width: 100%; height: 100%" />
        <el-empty v-else description="选择数据体和线号后点击显示" />
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogStore.seismicDisplayVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listSeismicVolumes, getSeismicSection } from '@/api/seismic'
import type { SeismicVolumeInfo } from '@/types/seismic'

use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, DataZoomComponent, CanvasRenderer])

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()

const volumes = ref<SeismicVolumeInfo[]>([])
const selectedVolumeId = ref<number | null>(null)
const direction = ref<'inline' | 'crossline'>('inline')
const lineIndex = ref(0)
const downsample = ref(1)
const loading = ref(false)
const chartOption = ref<Record<string, unknown> | null>(null)
const ampInfo = ref<{ min: number; max: number; traces: number; samples: number } | null>(null)

const selectedVolume = computed(() =>
  volumes.value.find((v) => v.id === selectedVolumeId.value) || null
)

const rangeMin = computed(() => {
  if (!selectedVolume.value) return 0
  return direction.value === 'inline'
    ? (selectedVolume.value.inline_min ?? 0)
    : (selectedVolume.value.crossline_min ?? 0)
})

const rangeMax = computed(() => {
  if (!selectedVolume.value) return 0
  return direction.value === 'inline'
    ? (selectedVolume.value.inline_max ?? 0)
    : (selectedVolume.value.crossline_max ?? 0)
})

const canDisplay = computed(() => selectedVolumeId.value !== null)

watch(
  () => dialogStore.seismicDisplayVisible,
  async (visible) => {
    if (visible && workareaStore.isOpen) {
      selectedVolumeId.value = null
      chartOption.value = null
      ampInfo.value = null
      lineIndex.value = 0
      downsample.value = 1
      direction.value = 'inline'
      try {
        volumes.value = await listSeismicVolumes(workareaStore.path)
      } catch {
        volumes.value = []
        ElMessage.warning('加载数据体列表失败')
      }
    }
  }
)

function onVolumeChange() {
  chartOption.value = null
  ampInfo.value = null
  if (selectedVolume.value) {
    lineIndex.value = direction.value === 'inline'
      ? (selectedVolume.value.inline_min ?? 0)
      : (selectedVolume.value.crossline_min ?? 0)
  }
}

watch(direction, () => {
  if (selectedVolume.value) {
    lineIndex.value = rangeMin.value
  }
  chartOption.value = null
  ampInfo.value = null
})

async function displaySection() {
  if (selectedVolumeId.value === null) return
  loading.value = true
  chartOption.value = null
  ampInfo.value = null
  try {
    const section = await getSeismicSection(
      workareaStore.path,
      selectedVolumeId.value,
      direction.value,
      lineIndex.value,
      downsample.value
    )

    const { data, times, positions, amp_min, amp_max } = section
    ampInfo.value = {
      min: amp_min,
      max: amp_max,
      traces: positions.length,
      samples: times.length
    }

    // Build heatmap data: [traceIndex, sampleIndex, amplitude]
    const heatmapData: number[][] = []
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        heatmapData.push([i, j, data[i][j]])
      }
    }

    // Symmetric amplitude range for color mapping
    const absMax = Math.max(Math.abs(amp_min), Math.abs(amp_max))

    chartOption.value = {
      tooltip: {
        position: 'top',
        formatter: (params: { value: number[] }) => {
          const [ti, si, amp] = params.value
          const pos = positions[ti] ?? ti
          const time = times[si] ?? si
          return `${direction.value === 'inline' ? 'Crossline' : 'Inline'}: ${pos}<br/>时间: ${time.toFixed(1)} ms<br/>振幅: ${amp.toFixed(4)}`
        }
      },
      grid: {
        left: 70,
        right: 60,
        top: 40,
        bottom: 80
      },
      xAxis: {
        type: 'category',
        data: positions.map(String),
        name: direction.value === 'inline' ? 'Crossline' : 'Inline',
        nameLocation: 'middle',
        nameGap: 30,
        position: 'top',
        axisLabel: {
          fontSize: 10,
          interval: Math.max(0, Math.floor(positions.length / 20) - 1)
        },
        splitArea: { show: false }
      },
      yAxis: {
        type: 'category',
        data: times.map((t) => t.toFixed(0)),
        name: '时间 (ms)',
        nameLocation: 'middle',
        nameGap: 50,
        inverse: false,
        axisLabel: {
          fontSize: 10,
          interval: Math.max(0, Math.floor(times.length / 20) - 1)
        },
        splitArea: { show: false }
      },
      visualMap: {
        min: -absMax,
        max: absMax,
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        itemHeight: 200,
        inRange: {
          color: [
            '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7',
            '#fddbc7', '#f4a582', '#d6604d', '#b2182b'
          ]
        },
        textStyle: { fontSize: 10 }
      },
      dataZoom: [
        { type: 'slider', xAxisIndex: 0, bottom: 10, height: 20 },
        { type: 'slider', yAxisIndex: 0, right: 80, width: 20 },
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0 }
      ],
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          progressive: 5000,
          emphasis: {
            itemStyle: { borderColor: '#333', borderWidth: 1 }
          }
        }
      ]
    }
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '读取剖面失败')
    } else {
      ElMessage.error('读取剖面失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.seismic-layout { display: flex; height: 80vh; gap: 12px; }
.seismic-sidebar {
  width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px; overflow-y: auto;
}
.sidebar-section { display: flex; flex-direction: column; gap: 6px; }
.sidebar-label { font-size: 13px; font-weight: 600; color: #303133; }
.range-hint { font-weight: 400; color: #909399; font-size: 11px; }
.seismic-chart { flex: 1; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
.stats-box {
  border: 1px solid #e4e7ed; border-radius: 4px; padding: 8px; font-size: 12px;
  background: #fafafa;
}
.stats-title { font-weight: 600; margin-bottom: 6px; color: #303133; }
.stats-row { display: flex; justify-content: space-between; line-height: 1.8; color: #606266; }
</style>
