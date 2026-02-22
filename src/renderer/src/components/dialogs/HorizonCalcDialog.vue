<template>
  <el-dialog
    v-model="dialogStore.horizonCalcVisible"
    title="层位计算"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="运算类型">
        <el-select v-model="form.operation" style="width: 100%">
          <el-option label="A - B (相减)" value="subtract" />
          <el-option label="A + B (相加)" value="add" />
          <el-option label="A × B (相乘)" value="multiply" />
          <el-option label="A ÷ B (相除)" value="divide" />
          <el-option label="A × 常数 (缩放)" value="scale" />
          <el-option label="A + 常数 (偏移)" value="offset" />
        </el-select>
      </el-form-item>
      <el-form-item label="层位 A">
        <el-select v-model="form.horizonA" placeholder="选择层位" style="width: 100%">
          <el-option v-for="h in horizons" :key="h.name" :label="`${h.name} (${h.point_count}点)`" :value="h.name" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="needsB" label="层位 B">
        <el-select v-model="form.horizonB" placeholder="选择层位" style="width: 100%">
          <el-option v-for="h in horizons" :key="h.name" :label="`${h.name} (${h.point_count}点)`" :value="h.name" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="needsConstant" label="常数值">
        <el-input-number v-model="form.constant" :precision="4" style="width: 100%" />
      </el-form-item>
      <el-form-item label="输出名称">
        <el-input v-model="form.resultName" placeholder="输出层位名" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.horizonCalcVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">计算</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listHorizons, calculateHorizon } from '@/api/horizon'
import type { HorizonInfo } from '@/api/horizon'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const loading = ref(false)
const horizons = ref<HorizonInfo[]>([])

const form = reactive({
  operation: 'subtract',
  horizonA: '',
  horizonB: '',
  constant: 1.0,
  resultName: ''
})

const needsB = computed(() => ['add', 'subtract', 'multiply', 'divide'].includes(form.operation))
const needsConstant = computed(() => ['scale', 'offset'].includes(form.operation))

const canSubmit = computed(() => {
  if (!form.horizonA || !form.resultName) return false
  if (needsB.value && !form.horizonB) return false
  return true
})

watch(() => dialogStore.horizonCalcVisible, async (visible) => {
  if (visible && workareaStore.isOpen) {
    form.operation = 'subtract'
    form.horizonA = ''
    form.horizonB = ''
    form.constant = 1.0
    form.resultName = ''
    horizons.value = await listHorizons(workareaStore.path)
  }
})

async function onSubmit() {
  loading.value = true
  try {
    const res = await calculateHorizon({
      workarea_path: workareaStore.path,
      horizon_a: form.horizonA,
      horizon_b: needsB.value ? form.horizonB : undefined,
      operation: form.operation,
      constant: needsConstant.value ? form.constant : undefined,
      result_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.horizonCalcVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '层位计算失败') : '层位计算失败'
    ElMessage.error(errMsg)
  } finally {
    loading.value = false
  }
}
</script>
