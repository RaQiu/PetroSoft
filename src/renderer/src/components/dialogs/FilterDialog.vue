<template>
  <el-dialog
    v-model="dialogStore.filterVisible"
    title="曲线滤波"
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
      <el-form-item label="滤波类型">
        <el-select v-model="form.filterType" style="width: 100%">
          <el-option label="滑动平均" value="moving_average" />
          <el-option label="中值滤波" value="median" />
        </el-select>
      </el-form-item>
      <el-form-item label="窗口大小">
        <el-input-number v-model="form.windowSize" :min="3" :max="101" :step="2" style="width: 100%" />
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.filterVisible = false">取消</el-button>
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
import { filterCurve } from '@/api/processing'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  curveName: '',
  filterType: 'moving_average',
  windowSize: 5,
  resultName: ''
})

const canSubmit = computed(() => form.wellName && form.curveName && form.windowSize >= 3 && form.resultName)

watch(() => dialogStore.filterVisible, (visible) => {
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
    const res = await filterCurve(form.wellName, {
      workarea_path: workareaStore.path,
      curve_name: form.curveName,
      filter_type: form.filterType,
      window_size: form.windowSize,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.filterVisible = false
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '滤波失败')
    } else {
      ElMessage.error('滤波失败')
    }
  } finally {
    loading.value = false
  }
}
</script>
