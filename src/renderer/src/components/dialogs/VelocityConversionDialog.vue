<template>
  <el-dialog
    v-model="dialogStore.velocityConversionVisible"
    title="速度场转换"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px" size="small">
      <el-form-item label="测网">
        <el-select v-model="form.surveyNet" placeholder="选择测网" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="速度体">
        <el-select v-model="form.velocityVolume" placeholder="选择速度体" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="转换类型">
        <el-radio-group v-model="form.conversionType">
          <el-radio value="rms2int">RMS → INT</el-radio>
          <el-radio value="int2rms">INT → RMS</el-radio>
          <el-radio value="rms2ave">RMS → AVE</el-radio>
          <el-radio value="ave2rms">AVE → RMS</el-radio>
          <el-radio value="int2ave">INT → AVE</el-radio>
          <el-radio value="ave2int">AVE → INT</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <div class="section-title">输出体范围</div>
    <el-form :model="form" label-width="100px" size="small">
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

    <el-form :model="form" label-width="100px" size="small" style="margin-top: 12px">
      <el-form-item label="输出体名称">
        <el-input v-model="form.outputName" placeholder="输入输出体名称" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button size="small" @click="onCompute">计算</el-button>
      <el-button size="small" type="primary" @click="onComputeAndClose">计算并关闭</el-button>
      <el-button size="small" @click="dialogStore.velocityConversionVisible = false">关闭</el-button>
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
  velocityVolume: '',
  conversionType: 'rms2int',
  inlineStart: 40,
  inlineEnd: 70,
  crosslineStart: 40,
  crosslineEnd: 70,
  outputName: ''
})

function onCompute() {
  ElMessage.info('功能开发中...')
}

function onComputeAndClose() {
  ElMessage.info('功能开发中...')
}

watch(() => dialogStore.velocityConversionVisible, (visible) => {
  if (visible) {
    form.surveyNet = ''
    form.velocityVolume = ''
    form.conversionType = 'rms2int'
    form.inlineStart = 40
    form.inlineEnd = 70
    form.crosslineStart = 40
    form.crosslineEnd = 70
    form.outputName = ''
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

.btn-row {
  display: flex;
  gap: 8px;
  padding-left: 100px;
}
</style>
