<template>
  <el-dialog
    v-model="dialogStore.basemapVisible"
    title="底图"
    width="800px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="basemap-layout">
      <div class="basemap-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">数据体</div>
          <el-select v-model="selectedVolumeId" placeholder="选择数据体" style="width: 100%" clearable>
            <el-option v-for="v in volumes" :key="v.id" :label="v.name" :value="v.id" />
          </el-select>
        </div>

        <div class="sidebar-section">
          <el-checkbox v-model="showWells">显示井位</el-checkbox>
          <el-checkbox v-model="showWellLabels">井名标注</el-checkbox>
        </div>

        <el-button type="primary" size="small" :loading="loading" @click="refresh">
          刷新
        </el-button>
      </div>

      <div class="basemap-chart">
        <v-chart v-if="chartOption" :option="chartOption" autoresize style="width: 100%; height: 100%" />
        <el-empty v-else description="点击刷新显示底图" />
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogStore.basemapVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { ScatterChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { listSeismicVolumes, getSurveyOutline } from '@/api/seismic'
import type { SeismicVolumeInfo, SurveyOutlinePoint } from '@/types/seismic'

use([ScatterChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

const volumes = ref<SeismicVolumeInfo[]>([])
const selectedVolumeId = ref<number | null>(null)
const showWells = ref(true)
const showWellLabels = ref(true)
const loading = ref(false)
const chartOption = ref<Record<string, unknown> | null>(null)

watch(
  () => dialogStore.basemapVisible,
  async (visible) => {
    if (visible && workareaStore.isOpen) {
      selectedVolumeId.value = null
      chartOption.value = null
      showWells.value = true
      showWellLabels.value = true
      try {
        volumes.value = await listSeismicVolumes(workareaStore.path)
      } catch {
        volumes.value = []
        ElMessage.warning('加载数据体列表失败')
      }
      await wellStore.fetchWells(workareaStore.path)
      await refresh()
    }
  }
)

async function refresh() {
  loading.value = true
  try {
    const series: Record<string, unknown>[] = []

    // Well positions scatter
    if (showWells.value && wellStore.wells.length > 0) {
      const wellData = wellStore.wells
        .filter((w) => w.x !== null && w.y !== null)
        .map((w) => ({
          value: [w.x, w.y],
          name: w.name
        }))

      series.push({
        name: '井位',
        type: 'scatter',
        data: wellData,
        symbolSize: 10,
        itemStyle: { color: '#e6a23c' },
        label: {
          show: showWellLabels.value,
          formatter: (params: { name: string }) => params.name,
          position: 'right',
          fontSize: 11,
          color: '#303133'
        },
        emphasis: {
          itemStyle: { borderColor: '#333', borderWidth: 2 }
        }
      })
    }

    // Survey outline polygon
    if (selectedVolumeId.value !== null) {
      try {
        const outlineRes = await getSurveyOutline(workareaStore.path, selectedVolumeId.value)
        const corners: SurveyOutlinePoint[] = outlineRes.outline
        if (corners.length >= 3) {
          // Close the polygon
          const polygonData = [...corners.map((c) => [c.x, c.y]), [corners[0].x, corners[0].y]]
          series.push({
            name: '测区范围',
            type: 'line',
            data: polygonData,
            lineStyle: {
              color: '#409eff',
              width: 2,
              type: 'dashed'
            },
            itemStyle: { color: '#409eff' },
            symbol: 'diamond',
            symbolSize: 8
          })
        }
      } catch {
        ElMessage.warning('无法获取测区范围')
      }
    }

    if (series.length === 0) {
      chartOption.value = null
      return
    }

    chartOption.value = {
      tooltip: {
        trigger: 'item',
        formatter: (params: { seriesName: string; name: string; value: number[] }) => {
          if (params.seriesName === '井位') {
            return `${params.name}<br/>X: ${params.value[0]?.toFixed(1)}<br/>Y: ${params.value[1]?.toFixed(1)}`
          }
          return `X: ${params.value[0]?.toFixed(1)}, Y: ${params.value[1]?.toFixed(1)}`
        }
      },
      legend: {
        data: series.map((s) => s.name as string),
        bottom: 10
      },
      grid: {
        left: 80,
        right: 40,
        top: 20,
        bottom: 60
      },
      xAxis: {
        type: 'value',
        name: 'X (m)',
        nameLocation: 'middle',
        nameGap: 30,
        scale: true
      },
      yAxis: {
        type: 'value',
        name: 'Y (m)',
        nameLocation: 'middle',
        nameGap: 55,
        scale: true
      },
      series
    }
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '加载底图失败')
    } else {
      ElMessage.error('加载底图失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.basemap-layout { display: flex; height: 550px; gap: 12px; }
.basemap-sidebar {
  width: 180px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px; overflow-y: auto;
}
.sidebar-section { display: flex; flex-direction: column; gap: 6px; }
.sidebar-label { font-size: 13px; font-weight: 600; color: #303133; }
.basemap-chart { flex: 1; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
</style>
