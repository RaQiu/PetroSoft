<template>
  <el-dialog
    v-model="dialogStore.standardizeVisible"
    :title="dialogTitle"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="源曲线">
        <el-select v-model="form.curveName" placeholder="选择曲线" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option label="Z-Score标准化" value="zscore" />
          <el-option label="Min-Max标准化" value="minmax" />
          <el-option label="归一化 (0~1)" value="normalize" />
        </el-select>
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
    </el-form>
    <div class="method-help">
      <template v-if="form.method === 'zscore'">Z-Score: (x - 均值) / 标准差，结果均值为0、标准差为1</template>
      <template v-else>Min-Max: (x - 最小值) / (最大值 - 最小值)，结果范围 [0, 1]</template>
    </div>
    <template #footer>
      <el-button @click="dialogStore.standardizeVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">执行</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellCurves } from '@/api/well'
import { standardizeCurve } from '@/api/processing'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  curveName: '',
  method: 'zscore',
  resultName: ''
})

const dialogTitle = computed(() => {
  const titles: Record<string, string> = {
    zscore: 'Z-Score标准化',
    minmax: 'Min-Max标准化',
    normalize: '归一化'
  }
  return titles[form.method] || '曲线标准化'
})

const canSubmit = computed(() => form.wellName && form.curveName && form.resultName)

watch(() => dialogStore.standardizeVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.curveName = ''
    form.resultName = ''
    availableCurves.value = []
    wellStore.fetchWells(workareaStore.path)
    // Apply preset method if provided
    if (dialogStore.standardizePresetMethod) {
      form.method = dialogStore.standardizePresetMethod
    } else {
      form.method = 'zscore'
    }
  }
})

async function onWellChange(wellName: string) {
  form.curveName = ''
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function onSubmit() {
  loading.value = true
  try {
    const res = await standardizeCurve(form.wellName, {
      workarea_path: workareaStore.path,
      curve_name: form.curveName,
      method: form.method,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.standardizeVisible = false
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '标准化失败')
    } else {
      ElMessage.error('标准化失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 4px 0 0 100px;
}
</style>
