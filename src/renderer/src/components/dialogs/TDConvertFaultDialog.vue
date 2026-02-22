<template>
  <el-dialog
    v-model="dialogStore.tdConvertFaultVisible"
    title="断层时深转换"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="90px" size="small">
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
      <el-form-item label="速度体">
        <el-select v-model="form.velocityVolume" placeholder="选择速度体" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="断层组">
        <el-select v-model="form.faultGroup" placeholder="选择断层组" style="width: 100%">
          <el-option label="(无)" value="" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="搜索">
        <el-input v-model="form.search" placeholder="搜索断层" clearable>
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </el-form-item>
    </el-form>

    <el-table :data="filteredFaults" height="200" size="small" border style="margin-bottom: 12px">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="name" label="断层" />
    </el-table>

    <el-form :model="form" label-width="90px" size="small">
      <el-form-item label="断层后缀名">
        <el-input v-model="form.suffix" placeholder="后缀名" />
      </el-form-item>
    </el-form>

    <el-progress :percentage="form.progress" :stroke-width="16" style="margin-top: 8px" />

    <template #footer>
      <el-button size="small" type="primary" @click="onApply">应用并保存</el-button>
      <el-button size="small" @click="onAbort">终止</el-button>
      <el-button size="small" @click="dialogStore.tdConvertFaultVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useDialogStore } from '@/stores/dialog'

const dialogStore = useDialogStore()

const form = reactive({
  surveyNet: '',
  convertType: 'time2depth',
  velocityVolume: '',
  faultGroup: '',
  search: '',
  faults: [] as { name: string }[],
  suffix: 'DepthSMI',
  progress: 0
})

const filteredFaults = computed(() => {
  if (!form.search) return form.faults
  return form.faults.filter(f => f.name.includes(form.search))
})

function onApply() {
  ElMessage.info('功能开发中...')
}

function onAbort() {
  ElMessage.info('功能开发中...')
}

watch(() => dialogStore.tdConvertFaultVisible, (visible) => {
  if (visible) {
    form.surveyNet = ''
    form.convertType = 'time2depth'
    form.velocityVolume = ''
    form.faultGroup = ''
    form.search = ''
    form.faults = []
    form.suffix = 'DepthSMI'
    form.progress = 0
  }
})
</script>
