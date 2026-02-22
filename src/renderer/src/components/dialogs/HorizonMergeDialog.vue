<template>
  <el-dialog
    v-model="dialogStore.horizonMergeVisible"
    title="层位合并"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择层位">
        <el-select v-model="form.horizons" multiple placeholder="选择多个层位" style="width: 100%">
          <el-option v-for="h in horizonList" :key="h.name" :label="`${h.name} (${h.point_count}点)`" :value="h.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="合并策略">
        <el-select v-model="form.strategy" style="width: 100%">
          <el-option label="取平均值" value="average" />
          <el-option label="取第一个非空" value="first" />
          <el-option label="取最小值" value="min" />
          <el-option label="取最大值" value="max" />
        </el-select>
      </el-form-item>
      <el-form-item label="输出名称">
        <el-input v-model="form.resultName" placeholder="合并后的层位名" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.horizonMergeVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">合并</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listHorizons, mergeHorizons } from '@/api/horizon'
import type { HorizonInfo } from '@/api/horizon'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const loading = ref(false)
const horizonList = ref<HorizonInfo[]>([])

const form = reactive({
  horizons: [] as string[],
  strategy: 'average',
  resultName: ''
})

const canSubmit = computed(() => form.horizons.length >= 2 && form.resultName)

watch(() => dialogStore.horizonMergeVisible, async (visible) => {
  if (visible && workareaStore.isOpen) {
    form.horizons = []
    form.strategy = 'average'
    form.resultName = ''
    horizonList.value = await listHorizons(workareaStore.path)
  }
})

async function onSubmit() {
  loading.value = true
  try {
    const res = await mergeHorizons({
      workarea_path: workareaStore.path,
      horizons: form.horizons,
      strategy: form.strategy,
      result_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.horizonMergeVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '层位合并失败') : '层位合并失败'
    ElMessage.error(errMsg)
  } finally {
    loading.value = false
  }
}
</script>
