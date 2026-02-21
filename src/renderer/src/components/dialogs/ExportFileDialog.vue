<template>
  <el-dialog
    v-model="dialogStore.exportFileVisible"
    title="导出数据"
    width="520px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="数据类型">
        <el-select v-model="form.dataType" placeholder="选择数据类型" style="width: 100%">
          <el-option
            v-for="dt in DATA_TYPES"
            :key="dt.value"
            :label="dt.label"
            :value="dt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="needsWellName" label="井名">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%">
          <el-option
            v-for="w in wellStore.wells"
            :key="w.name"
            :label="w.name"
            :value="w.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="保存路径">
        <div style="display: flex; gap: 8px; width: 100%">
          <el-input v-model="form.filePath" placeholder="选择保存位置" readonly />
          <el-button @click="selectSavePath">选择位置</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.exportFileVisible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!canSubmit"
        :loading="loading"
        @click="onSubmit"
      >
        导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { exportData } from '@/api/export'
import { DATA_TYPES } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)

const form = reactive({
  dataType: '',
  filePath: '',
  wellName: ''
})

const needsWellName = computed(() => {
  const dt = DATA_TYPES.find((d) => d.value === form.dataType)
  return dt?.needsWellName ?? false
})

const canSubmit = computed(() => {
  if (!form.dataType || !form.filePath) return false
  if (needsWellName.value && !form.wellName) return false
  return true
})

watch(
  () => dialogStore.exportFileVisible,
  (visible) => {
    if (visible) {
      form.dataType = dialogStore.exportPresetType || ''
      form.filePath = ''
      form.wellName = ''
      if (workareaStore.isOpen) {
        wellStore.fetchWells(workareaStore.path)
      }
    }
  }
)

async function selectSavePath() {
  const result = await window.api.saveFile('export.txt')
  if (!result.canceled && result.filePath) {
    form.filePath = result.filePath
  }
}

async function onSubmit() {
  if (!workareaStore.isOpen) {
    ElMessage.warning('请先打开或创建工区')
    return
  }

  loading.value = true
  try {
    const res = await exportData({
      file_path: form.filePath,
      data_type: form.dataType,
      workarea_path: workareaStore.path,
      well_name: form.wellName
    })
    ElMessage.success(res.message)
    dialogStore.exportFileVisible = false
    form.dataType = ''
    form.filePath = ''
    form.wellName = ''
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '导出失败')
    } else {
      ElMessage.error('导出失败')
    }
  } finally {
    loading.value = false
  }
}
</script>
