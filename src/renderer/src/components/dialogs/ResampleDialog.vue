<template>
  <el-dialog
    v-model="dialogStore.resampleVisible"
    title="曲线重采样"
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
          <el-option v-for="c in availableCurves" :key="c.name" :label="`${c.name} (${c.sample_interval}m)`" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="新采样间隔">
        <el-input-number v-model="form.newInterval" :min="0.01" :max="10" :step="0.125" :precision="3" style="width: 100%" />
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.resampleVisible = false">取消</el-button>
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
import { resampleCurve } from '@/api/processing'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  curveName: '',
  newInterval: 0.25,
  resultName: ''
})

const canSubmit = computed(() => form.wellName && form.curveName && form.newInterval > 0 && form.resultName)

watch(() => dialogStore.resampleVisible, (visible) => {
  if (visible && workareaStore.isOpen) wellStore.fetchWells(workareaStore.path)
})

async function onWellChange(wellName: string) {
  form.curveName = ''
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function onSubmit() {
  loading.value = true
  try {
    const res = await resampleCurve(form.wellName, {
      workarea_path: workareaStore.path,
      curve_name: form.curveName,
      new_interval: form.newInterval,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.resampleVisible = false
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '重采样失败')
    } else {
      ElMessage.error('重采样失败')
    }
  } finally {
    loading.value = false
  }
}
</script>
