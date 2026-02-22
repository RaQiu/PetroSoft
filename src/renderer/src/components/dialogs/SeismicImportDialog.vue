<template>
  <el-dialog
    v-model="dialogStore.seismicImportVisible"
    title="导入地震数据"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="数据名称">
        <el-input v-model="form.name" placeholder="输入数据体名称" />
      </el-form-item>
      <el-form-item label="文件路径">
        <div style="display: flex; gap: 8px; width: 100%">
          <el-input v-model="form.filePath" placeholder="选择 SEG-Y 文件" readonly style="flex: 1" />
          <el-button @click="selectFile">选择</el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.seismicImportVisible = false">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="submit">
        导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { importSeismic } from '@/api/seismic'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()

const form = reactive({
  name: '',
  filePath: ''
})
const loading = ref(false)

const canSubmit = computed(() => form.name.trim() && form.filePath.trim())

watch(
  () => dialogStore.seismicImportVisible,
  (visible) => {
    if (visible) {
      form.name = ''
      form.filePath = ''
    }
  }
)

async function selectFile() {
  const result = await window.api.openFile([
    { name: 'SEG-Y 文件', extensions: ['sgy', 'segy'] }
  ])
  if (result.canceled || !result.filePaths.length) return
  form.filePath = result.filePaths[0]
  // Auto-fill name from filename if empty
  if (!form.name) {
    const filename = result.filePaths[0].split(/[\\/]/).pop() || ''
    form.name = filename.replace(/\.(sgy|segy)$/i, '')
  }
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  try {
    const res = await importSeismic({
      file_path: form.filePath,
      name: form.name.trim(),
      workarea_path: workareaStore.path
    })
    ElMessage.success(res.message)
    dialogStore.seismicImportVisible = false
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
