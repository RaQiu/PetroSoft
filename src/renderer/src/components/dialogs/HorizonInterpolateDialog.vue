<template>
  <el-dialog
    v-model="dialogStore.horizonInterpolateVisible"
    title="层位插值"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择层位">
        <el-select v-model="form.horizonName" placeholder="选择层位" style="width: 100%">
          <el-option v-for="h in horizons" :key="h.name" :label="`${h.name} (${h.point_count}点)`" :value="h.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="插值方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option label="线性插值" value="linear" />
          <el-option label="最近邻插值" value="nearest" />
          <el-option label="三次样条插值" value="cubic" />
        </el-select>
      </el-form-item>
      <el-form-item label="输出名称">
        <el-input v-model="form.resultName" placeholder="默认: 原名_interp" />
      </el-form-item>
    </el-form>
    <div class="method-help">对层位中的空白区域进行插值填充</div>
    <template #footer>
      <el-button @click="dialogStore.horizonInterpolateVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!form.horizonName" :loading="loading" @click="onSubmit">插值</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listHorizons, interpolateHorizon } from '@/api/horizon'
import type { HorizonInfo } from '@/api/horizon'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const loading = ref(false)
const horizons = ref<HorizonInfo[]>([])

const form = reactive({
  horizonName: '',
  method: 'linear',
  resultName: ''
})

watch(() => dialogStore.horizonInterpolateVisible, async (visible) => {
  if (visible && workareaStore.isOpen) {
    form.horizonName = ''
    form.method = 'linear'
    form.resultName = ''
    horizons.value = await listHorizons(workareaStore.path)
  }
})

async function onSubmit() {
  loading.value = true
  try {
    const res = await interpolateHorizon({
      workarea_path: workareaStore.path,
      horizon_name: form.horizonName,
      method: form.method,
      result_name: form.resultName || undefined
    })
    ElMessage.success(res.message)
    dialogStore.horizonInterpolateVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '层位插值失败') : '层位插值失败'
    ElMessage.error(errMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 110px;
}
</style>
