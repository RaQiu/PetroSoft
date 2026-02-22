<template>
  <el-dialog
    v-model="dialogStore.horizonDecimateVisible"
    title="层位抽稀"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择层位">
        <el-select v-model="form.horizonName" placeholder="选择层位" style="width: 100%">
          <el-option v-for="h in horizons" :key="h.name" :label="`${h.name} (${h.point_count}点)`" :value="h.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="抽稀因子">
        <el-input-number v-model="form.factor" :min="2" :max="20" :step="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="输出名称">
        <el-input v-model="form.resultName" placeholder="默认: 原名_decN" />
      </el-form-item>
    </el-form>
    <div class="method-help">每隔 N 个点保留一个，减少层位数据密度</div>
    <template #footer>
      <el-button @click="dialogStore.horizonDecimateVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!form.horizonName" :loading="loading" @click="onSubmit">抽稀</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listHorizons, decimateHorizon } from '@/api/horizon'
import type { HorizonInfo } from '@/api/horizon'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const loading = ref(false)
const horizons = ref<HorizonInfo[]>([])

const form = reactive({
  horizonName: '',
  factor: 2,
  resultName: ''
})

watch(() => dialogStore.horizonDecimateVisible, async (visible) => {
  if (visible && workareaStore.isOpen) {
    form.horizonName = ''
    form.factor = 2
    form.resultName = ''
    horizons.value = await listHorizons(workareaStore.path)
  }
})

async function onSubmit() {
  loading.value = true
  try {
    const res = await decimateHorizon({
      workarea_path: workareaStore.path,
      horizon_name: form.horizonName,
      factor: form.factor,
      result_name: form.resultName || undefined
    })
    ElMessage.success(res.message)
    dialogStore.horizonDecimateVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '层位抽稀失败') : '层位抽稀失败'
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
