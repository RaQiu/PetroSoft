<template>
  <el-dialog
    v-model="dialogStore.vpCorrectionVisible"
    title="校正纵波速度曲线 (Faust)"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="电阻率曲线">
        <el-select v-model="form.rtCurve" placeholder="RT" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="系数">
        <el-input-number v-model="form.coefficient" :precision="0" :step="100" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" />
      </el-form-item>
    </el-form>
    <div class="method-help">VP = coefficient × (depth × RT)^(1/6)</div>

    <template #footer>
      <el-button @click="dialogStore.vpCorrectionVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">计算</el-button>
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
import { correctVp } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  rtCurve: 'RT',
  coefficient: 2000,
  resultName: 'VP_Faust'
})

const canSubmit = computed(() => form.wellName && form.rtCurve && form.resultName)

watch(() => dialogStore.vpCorrectionVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.rtCurve = 'RT'
    form.coefficient = 2000
    form.resultName = 'VP_Faust'
    availableCurves.value = []
    wellStore.fetchWells(workareaStore.path)
  }
})

async function onWellChange(wellName: string) {
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function onSubmit() {
  loading.value = true
  try {
    const res = await correctVp(form.wellName, {
      workarea_path: workareaStore.path,
      rt_curve: form.rtCurve,
      coefficient: form.coefficient,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'correct_vp', form.wellName, JSON.stringify({ rtCurve: form.rtCurve }), 'success', res.message).catch(() => {})
    dialogStore.vpCorrectionVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '纵波速度校正失败') : '纵波速度校正失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'correct_vp', form.wellName, JSON.stringify({ rtCurve: form.rtCurve }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 120px;
}
</style>
