<template>
  <el-dialog
    v-model="dialogStore.importFileVisible"
    title="导入数据"
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
        <el-input v-model="form.wellName" placeholder="请输入井名" />
      </el-form-item>
      <el-form-item label="文件路径">
        <div style="display: flex; gap: 8px; width: 100%">
          <el-input v-model="form.filePath" placeholder="选择文件" readonly />
          <el-button @click="selectFile">选择文件</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.importFileVisible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!canSubmit"
        :loading="loading"
        @click="onSubmit"
      >
        导入
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
import { importData } from '@/api/data'
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

// Preset data type from dialog store
watch(
  () => dialogStore.importFileVisible,
  (visible) => {
    if (visible && dialogStore.importPresetType) {
      form.dataType = dialogStore.importPresetType
    }
  }
)

async function selectFile() {
  const result = await window.api.openFile([
    { name: '数据文件', extensions: ['txt', 'csv', 'dat'] },
    { name: '所有文件', extensions: ['*'] }
  ])
  if (!result.canceled && result.filePaths.length) {
    form.filePath = result.filePaths[0]
  }
}

async function onSubmit() {
  if (!workareaStore.isOpen) {
    ElMessage.warning('请先打开或创建工区')
    return
  }

  loading.value = true
  try {
    const res = await importData({
      file_path: form.filePath,
      data_type: form.dataType,
      workarea_path: workareaStore.path,
      well_name: form.wellName
    })
    ElMessage.success(res.message)
    // Refresh well list after import
    await wellStore.fetchWells(workareaStore.path)
    dialogStore.importFileVisible = false
    form.dataType = ''
    form.filePath = ''
    form.wellName = ''
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '导入失败')
    } else {
      ElMessage.error('导入失败')
    }
  } finally {
    loading.value = false
  }
}
</script>
