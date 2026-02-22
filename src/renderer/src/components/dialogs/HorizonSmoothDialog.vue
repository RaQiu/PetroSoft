<template>
  <el-dialog
    v-model="dialogStore.horizonSmoothVisible"
    title="层位平滑"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择层位">
        <el-select v-model="form.horizonName" placeholder="选择层位" style="width: 100%">
          <el-option v-for="h in horizons" :key="h.name" :label="`${h.name} (${h.point_count}点)`" :value="h.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="平滑方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option label="均值滤波" value="mean" />
          <el-option label="中值滤波" value="median" />
          <el-option label="高斯滤波" value="gaussian" />
        </el-select>
      </el-form-item>
      <el-form-item label="窗口大小">
        <el-input-number v-model="form.windowSize" :min="3" :max="21" :step="2" style="width: 100%" />
      </el-form-item>
      <el-form-item label="输出名称">
        <el-input v-model="form.resultName" placeholder="默认: 原名_smooth" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.horizonSmoothVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!form.horizonName" :loading="loading" @click="onSubmit">平滑</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listHorizons, smoothHorizon } from '@/api/horizon'
import type { HorizonInfo } from '@/api/horizon'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const loading = ref(false)
const horizons = ref<HorizonInfo[]>([])

const form = reactive({
  horizonName: '',
  method: 'mean',
  windowSize: 3,
  resultName: ''
})

watch(() => dialogStore.horizonSmoothVisible, async (visible) => {
  if (visible && workareaStore.isOpen) {
    form.horizonName = ''
    form.method = 'mean'
    form.windowSize = 3
    form.resultName = ''
    horizons.value = await listHorizons(workareaStore.path)
  }
})

async function onSubmit() {
  loading.value = true
  try {
    const res = await smoothHorizon({
      workarea_path: workareaStore.path,
      horizon_name: form.horizonName,
      method: form.method,
      window_size: form.windowSize,
      result_name: form.resultName || undefined
    })
    ElMessage.success(res.message)
    dialogStore.horizonSmoothVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '层位平滑失败') : '层位平滑失败'
    ElMessage.error(errMsg)
  } finally {
    loading.value = false
  }
}
</script>
