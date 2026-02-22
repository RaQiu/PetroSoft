<template>
  <el-dialog
    v-model="dialogStore.tdConvertVolumeVisible"
    title="数据体时深转换"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px" size="small">
      <el-form-item label="测网">
        <el-select v-model="form.surveyNet" placeholder="选择测网" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="转换类型">
        <el-select v-model="form.convertType" style="width: 100%">
          <el-option label="时间到深度" value="time2depth" />
          <el-option label="深度到时间" value="depth2time" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-tabs v-model="form.activeTab" type="border-card" size="small">
      <el-tab-pane label="参数" name="params">
        <el-form :model="form" label-width="110px" size="small">
          <el-form-item label="待转换数据">
            <el-select v-model="form.sourceData" placeholder="选择数据体" style="width: 100%">
              <el-option label="(无)" value="" disabled />
            </el-select>
          </el-form-item>
          <el-form-item label="速度体">
            <el-select v-model="form.velocityVolume" placeholder="选择速度体" style="width: 100%">
              <el-option label="(无)" value="" disabled />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="体" name="volume">
        <div class="placeholder-text">体参数配置</div>
      </el-tab-pane>
    </el-tabs>

    <div class="section-title">范围</div>
    <el-form :model="form" label-width="110px" size="small">
      <el-form-item label="类型">
        <el-select v-model="form.rangeType" style="width: 100%">
          <el-option label="体" value="volume" />
        </el-select>
      </el-form-item>
      <el-form-item label="线">
        <div class="range-row">
          <el-input-number v-model="form.lineStart" :min="0" size="small" controls-position="right" />
          <span class="range-sep">—</span>
          <el-input-number v-model="form.lineEnd" :min="0" size="small" controls-position="right" />
        </div>
      </el-form-item>
      <el-form-item label="道">
        <div class="range-row">
          <el-input-number v-model="form.traceStart" :min="0" size="small" controls-position="right" />
          <span class="range-sep">—</span>
          <el-input-number v-model="form.traceEnd" :min="0" size="small" controls-position="right" />
        </div>
      </el-form-item>
      <el-form-item label="目标体采样率">
        <el-input-number v-model="form.sampleRate" :min="1" :max="100" size="small" controls-position="right" />
      </el-form-item>
      <el-form-item label="目标体名称">
        <el-input v-model="form.outputName" placeholder="输入目标体名称" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button size="small" @click="onCompute">计算</el-button>
      <el-button size="small" type="primary" @click="onComputeAndClose">计算并关闭</el-button>
      <el-button size="small" @click="dialogStore.tdConvertVolumeVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'

const dialogStore = useDialogStore()

const form = reactive({
  surveyNet: '',
  convertType: 'time2depth',
  activeTab: 'params',
  sourceData: '',
  velocityVolume: '',
  rangeType: 'volume',
  lineStart: 40,
  lineEnd: 70,
  traceStart: 40,
  traceEnd: 70,
  sampleRate: 2,
  outputName: 'Vol'
})

function onCompute() {
  ElMessage.info('功能开发中...')
}

function onComputeAndClose() {
  ElMessage.info('功能开发中...')
}

watch(() => dialogStore.tdConvertVolumeVisible, (visible) => {
  if (visible) {
    form.surveyNet = ''
    form.convertType = 'time2depth'
    form.activeTab = 'params'
    form.sourceData = ''
    form.velocityVolume = ''
    form.rangeType = 'volume'
    form.lineStart = 40
    form.lineEnd = 70
    form.traceStart = 40
    form.traceEnd = 70
    form.sampleRate = 2
    form.outputName = 'Vol'
  }
})
</script>

<style scoped lang="scss">
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin: 12px 0 8px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
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

.placeholder-text {
  color: #909399;
  font-size: 12px;
  padding: 16px 0;
  text-align: center;
}
</style>
