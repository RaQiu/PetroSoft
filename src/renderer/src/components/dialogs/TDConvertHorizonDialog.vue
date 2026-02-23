<template>
  <el-dialog
    v-model="dialogStore.tdConvertHorizonVisible"
    title="层位时深转换"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="90px" size="small">
      <el-form-item label="测网">
        <el-select v-model="form.surveyNet" placeholder="选择测网" style="width: 100%">
          <el-option v-for="s in surveys" :key="s.id" :label="s.name" :value="s.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="转换类型">
        <el-select v-model="form.convertType" style="width: 100%">
          <el-option label="时间到深度" value="time2depth" />
          <el-option label="深度到时间" value="depth2time" />
        </el-select>
      </el-form-item>
      <el-form-item label="速度体">
        <el-select v-model="form.velocityVolume" placeholder="选择速度体" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="层位组">
        <el-select v-model="form.horizonGroup" placeholder="选择层位组" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
    </el-form>

    <el-table :data="form.horizons" height="200" size="small" border style="margin-bottom: 12px">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="name" label="层位" />
    </el-table>

    <el-form :model="form" label-width="90px" size="small">
      <el-form-item label="层位后缀名">
        <el-input v-model="form.suffix" placeholder="后缀名" />
      </el-form-item>
    </el-form>

    <el-progress :percentage="form.progress" :stroke-width="16" style="margin-top: 8px" />

    <template #footer>
      <el-button size="small" type="primary" @click="onApply">应用并保存</el-button>
      <el-button size="small" @click="onAbort">终止</el-button>
      <el-button size="small" @click="dialogStore.tdConvertHorizonVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listSurveys } from '@/api/seismic'
import type { SurveyInfo } from '@/types/seismic'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const surveys = ref<SurveyInfo[]>([])

const form = reactive({
  surveyNet: '',
  convertType: 'time2depth',
  velocityVolume: '',
  horizonGroup: '',
  horizons: [] as { name: string }[],
  suffix: 'Depth',
  progress: 0
})

function onApply() {
  ElMessage.info('功能开发中...')
}

function onAbort() {
  ElMessage.info('功能开发中...')
}

watch(() => dialogStore.tdConvertHorizonVisible, async (visible) => {
  if (visible) {
    form.surveyNet = ''
    form.convertType = 'time2depth'
    form.velocityVolume = ''
    form.horizonGroup = ''
    form.horizons = []
    form.suffix = 'Depth'
    form.progress = 0
    if (workareaStore.path) {
      try { surveys.value = await listSurveys(workareaStore.path) } catch { surveys.value = [] }
    }
  }
})
</script>
