<template>
  <el-dialog
    v-model="dialogStore.baselineVisible"
    title="基线校正"
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
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
    </el-form>
    <div class="baseline-hint">
      基线校正将减去曲线的均值（DC偏移量），使校正后的曲线均值为零。
    </div>
    <template #footer>
      <el-button @click="dialogStore.baselineVisible = false">取消</el-button>
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
import { baselineCorrection } from '@/api/processing'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  curveName: '',
  resultName: ''
})

const canSubmit = computed(() => form.wellName && form.curveName && form.resultName)

watch(() => dialogStore.baselineVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.curveName = ''
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
    const res = await baselineCorrection(form.wellName, {
      workarea_path: workareaStore.path,
      curve_name: form.curveName,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    dialogStore.baselineVisible = false
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '基线校正失败')
    } else {
      ElMessage.error('基线校正失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.baseline-hint {
  font-size: 12px;
  color: #909399;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  margin-top: 8px;
}
</style>
