<template>
  <el-dialog
    v-model="dialogStore.quickCalibrationVisible"
    title="快速标定"
    width="1100px"
    :close-on-click-modal="false"
  >
    <div class="calibration-layout">
      <!-- Left: Well selection -->
      <div class="panel panel-left">
        <el-form label-width="70px" size="small">
          <el-form-item label="选择井组">
            <el-select v-model="form.wellGroup" placeholder="全部井" style="width: 100%">
              <el-option label="全部井" value="" />
            </el-select>
          </el-form-item>
          <el-form-item label="井名搜索">
            <el-input v-model="form.wellSearch" placeholder="输入井名搜索" clearable />
          </el-form-item>
        </el-form>
        <el-table :data="filteredWells" height="320" highlight-current-row size="small" border @current-change="onWellSelect">
          <el-table-column type="index" label="序号" width="50" />
          <el-table-column prop="name" label="井名" />
          <el-table-column prop="curveCount" label="曲线" width="60" />
          <el-table-column prop="layerCount" label="分" width="50" />
        </el-table>
      </div>

      <!-- Center: Calibration settings -->
      <div class="panel panel-center">
        <el-form label-width="auto" size="small">
          <el-radio-group v-model="form.calibrationType" style="margin-bottom: 12px">
            <el-radio value="multi">多层标定</el-radio>
            <el-radio value="single">单层标定</el-radio>
          </el-radio-group>
        </el-form>
        <div class="two-column">
          <div class="column">
            <div class="column-title">选择解释层位</div>
            <el-table :data="form.horizons" height="280" size="small" border>
              <el-table-column type="selection" width="40" />
              <el-table-column prop="name" label="层位" />
            </el-table>
          </div>
          <div class="column">
            <div class="column-title">选择井分层</div>
            <el-table :data="form.wellLayers" height="280" size="small" border>
              <el-table-column type="selection" width="40" />
              <el-table-column prop="name" label="分层" />
            </el-table>
          </div>
        </div>
      </div>

      <!-- Right: Chart -->
      <div class="panel panel-right">
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>

    <div class="progress-row">
      <el-progress :percentage="form.progress" :stroke-width="16" style="flex: 1" />
    </div>

    <template #footer>
      <el-button size="small" @click="onApply">应用</el-button>
      <el-button size="small" @click="onSave">保存</el-button>
      <el-button size="small" @click="onAbort">终止</el-button>
      <el-button size="small" @click="dialogStore.quickCalibrationVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import * as echarts from 'echarts'

const dialogStore = useDialogStore()
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const form = reactive({
  wellGroup: '',
  wellSearch: '',
  calibrationType: 'multi',
  selectedWell: '',
  horizons: [] as { name: string }[],
  wellLayers: [] as { name: string }[],
  progress: 0
})

const filteredWells = ref<{ name: string; curveCount: number; layerCount: number }[]>([])

function onWellSelect(row: { name: string } | null) {
  form.selectedWell = row?.name ?? ''
}

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption({
    title: { text: '时深关系', left: 'center', textStyle: { fontSize: 13 } },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'value', name: '时间(ms)', nameLocation: 'center', nameGap: 25 },
    yAxis: { type: 'value', name: '深度(m)', nameLocation: 'center', nameGap: 40, inverse: true },
    series: []
  })
}

function onApply() {
  ElMessage.info('功能开发中...')
}

function onSave() {
  ElMessage.info('功能开发中...')
}

function onAbort() {
  ElMessage.info('功能开发中...')
}

function onResize() {
  chartInstance?.resize()
}

watch(() => dialogStore.quickCalibrationVisible, (visible) => {
  if (visible) {
    form.wellGroup = ''
    form.wellSearch = ''
    form.calibrationType = 'multi'
    form.selectedWell = ''
    form.horizons = []
    form.wellLayers = []
    form.progress = 0
    filteredWells.value = []
    setTimeout(() => initChart(), 100)
  } else {
    chartInstance?.dispose()
    chartInstance = null
  }
})

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.calibration-layout {
  display: flex;
  gap: 12px;
  min-height: 420px;
}

.panel {
  display: flex;
  flex-direction: column;
}

.panel-left {
  width: 240px;
  flex-shrink: 0;
}

.panel-center {
  width: 340px;
  flex-shrink: 0;
}

.panel-right {
  flex: 1;
  min-width: 300px;
}

.two-column {
  display: flex;
  gap: 8px;
}

.column {
  flex: 1;
}

.column-title {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #606266;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.progress-row {
  display: flex;
  align-items: center;
  margin-top: 12px;
}
</style>
