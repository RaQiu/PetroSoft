<template>
  <el-dialog
    v-model="dialogStore.outlierVisible"
    title="异常值处理"
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
      <el-form-item label="检测方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option value="iqr" label="IQR (四分位距)" />
          <el-option value="iqr3" label="IQR x3 (宽松)" />
          <el-option value="sigma2" label="2-Sigma" />
          <el-option value="sigma3" label="3-Sigma" />
          <el-option value="percentile" label="百分位截断 (1%)" />
          <el-option value="mad" label="MAD (中位数绝对偏差)" />
        </el-select>
      </el-form-item>
      <el-form-item label="处理方式">
        <el-radio-group v-model="form.action">
          <el-radio value="null">置空 (设为空值)</el-radio>
          <el-radio value="clip">截断 (限制到边界)</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.outlierVisible = false">取消</el-button>
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
import { removeOutliers } from '@/api/processing'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  curveName: '',
  method: 'iqr',
  action: 'null',
  resultName: ''
})

const canSubmit = computed(() => form.wellName && form.curveName && form.resultName)

watch(() => dialogStore.outlierVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.curveName = ''
    form.method = 'iqr'
    form.action = 'null'
    form.resultName = ''
    availableCurves.value = []
    wellStore.fetchWells(workareaStore.path)
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
    const res = await removeOutliers(form.wellName, {
      workarea_path: workareaStore.path,
      curve_name: form.curveName,
      method: form.method,
      action: form.action,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.outlierVisible = false
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '异常值处理失败')
    } else {
      ElMessage.error('异常值处理失败')
    }
  } finally {
    loading.value = false
  }
}
</script>
