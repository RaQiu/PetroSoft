<template>
  <el-dialog
    v-model="dialogStore.velocityModelingVisible"
    title="速度场建模 - 模型约束"
    width="1100px"
    :close-on-click-modal="false"
  >
    <div class="modeling-layout">
      <!-- Left: Parameters -->
      <div class="panel panel-left">
        <el-form :model="form" label-width="70px" size="small">
          <el-form-item label="测网">
            <el-select v-model="form.surveyNet" placeholder="选择测网" style="width: 100%">
              <el-option label="(无)" value="" disabled />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="section-title">参数</div>
        <el-tabs v-model="form.activeTab" type="border-card" class="param-tabs">
          <el-tab-pane label="输入" name="input">
            <el-form :model="form" label-width="70px" size="small">
              <el-form-item label="格架模型">
                <el-select v-model="form.gridModel" placeholder="选择格架模型" style="width: 100%">
                  <el-option label="(无)" value="" disabled />
                </el-select>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="井" name="well">
            <div class="placeholder-text">井参数配置</div>
          </el-tab-pane>
          <el-tab-pane label="计算参数" name="compute">
            <div class="placeholder-text">计算参数配置</div>
          </el-tab-pane>
          <el-tab-pane label="输出" name="output">
            <div class="placeholder-text">输出参数配置</div>
          </el-tab-pane>
        </el-tabs>

        <div class="section-title" style="margin-top: 12px">范围</div>
        <el-form :model="form" label-width="70px" size="small">
          <el-form-item label="类型">
            <el-select v-model="form.rangeType" style="width: 100%">
              <el-option label="体" value="volume" />
            </el-select>
          </el-form-item>
          <el-form-item label="InLine">
            <div class="range-row">
              <el-input-number v-model="form.inlineStart" :min="0" size="small" controls-position="right" />
              <span class="range-sep">—</span>
              <el-input-number v-model="form.inlineEnd" :min="0" size="small" controls-position="right" />
            </div>
          </el-form-item>
          <el-form-item label="CrossLine">
            <div class="range-row">
              <el-input-number v-model="form.crosslineStart" :min="0" size="small" controls-position="right" />
              <span class="range-sep">—</span>
              <el-input-number v-model="form.crosslineEnd" :min="0" size="small" controls-position="right" />
            </div>
          </el-form-item>
        </el-form>
        <div class="btn-row">
          <el-button size="small">引用已有体范围</el-button>
          <el-button size="small">从底图中选择范围</el-button>
        </div>
      </div>

      <!-- Right: Chart -->
      <div class="panel panel-right">
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>

    <template #footer>
      <el-button size="small" @click="onCompute">计算</el-button>
      <el-button size="small" type="primary" @click="onComputeAndClose">计算并关闭</el-button>
      <el-button size="small" @click="dialogStore.velocityModelingVisible = false">关闭</el-button>
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
  surveyNet: '',
  activeTab: 'input',
  gridModel: '',
  rangeType: 'volume',
  inlineStart: 40,
  inlineEnd: 70,
  crosslineStart: 40,
  crosslineEnd: 70
})

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption({
    title: { text: '速度场', left: 'center', textStyle: { fontSize: 13 } },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'value', name: '时间(ms)', nameLocation: 'center', nameGap: 25 },
    yAxis: { type: 'value', name: '深度(m)', nameLocation: 'center', nameGap: 40, inverse: true },
    series: []
  })
}

function onCompute() {
  ElMessage.info('功能开发中...')
}

function onComputeAndClose() {
  ElMessage.info('功能开发中...')
}

function onResize() {
  chartInstance?.resize()
}

watch(() => dialogStore.velocityModelingVisible, (visible) => {
  if (visible) {
    form.surveyNet = ''
    form.activeTab = 'input'
    form.gridModel = ''
    form.rangeType = 'volume'
    form.inlineStart = 40
    form.inlineEnd = 70
    form.crosslineStart = 40
    form.crosslineEnd = 70
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
.modeling-layout {
  display: flex;
  gap: 16px;
  min-height: 480px;
}

.panel-left {
  width: 420px;
  flex-shrink: 0;
}

.panel-right {
  flex: 1;
  min-width: 300px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}

.param-tabs {
  :deep(.el-tabs__content) {
    min-height: 80px;
  }
}

.range-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.range-sep {
  color: #909399;
}

.btn-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.placeholder-text {
  color: #909399;
  font-size: 12px;
  padding: 16px 0;
  text-align: center;
}

.chart-container {
  width: 100%;
  height: 480px;
}
</style>
