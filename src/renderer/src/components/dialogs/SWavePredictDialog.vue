<template>
  <el-dialog
    v-model="dialogStore.sWavePredictVisible"
    title="横波预测"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="纵波曲线">
        <el-select v-model="form.dtCurve" placeholder="DT 曲线" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="预测方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option label="Castagna 泥岩线" value="castagna" />
          <el-option label="自定义线性关系" value="custom" />
        </el-select>
      </el-form-item>
      <el-form-item label="系数 a">
        <el-input-number v-model="form.coeffA" :precision="4" :step="0.01" style="width: 100%" />
      </el-form-item>
      <el-form-item label="系数 b">
        <el-input-number v-model="form.coeffB" :precision="1" :step="10" style="width: 100%" />
      </el-form-item>
      <div class="method-help">Vs(m/s) = a × Vp(m/s) + b<br>Castagna 默认: a=0.8621, b=-1172.4</div>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="DTS" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.sWavePredictVisible = false">取消</el-button>
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
import { predictVs } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  dtCurve: 'DT',
  method: 'castagna',
  coeffA: 0.8621,
  coeffB: -1172.4,
  resultName: 'DTS'
})

const canSubmit = computed(() => form.wellName && form.dtCurve && form.resultName)

watch(() => dialogStore.sWavePredictVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.dtCurve = 'DT'
    form.method = 'castagna'
    form.coeffA = 0.8621
    form.coeffB = -1172.4
    form.resultName = 'DTS'
    availableCurves.value = []
    wellStore.fetchWells(workareaStore.path)
  }
})

watch(() => form.method, (m) => {
  if (m === 'castagna') {
    form.coeffA = 0.8621
    form.coeffB = -1172.4
  }
})

async function onWellChange(wellName: string) {
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function onSubmit() {
  loading.value = true
  try {
    const res = await predictVs(form.wellName, {
      workarea_path: workareaStore.path,
      dt_curve: form.dtCurve,
      method: form.method,
      coeff_a: form.coeffA,
      coeff_b: form.coeffB,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'predict_vs', form.wellName, JSON.stringify({ method: form.method, dtCurve: form.dtCurve, resultName: form.resultName }), 'success', res.message).catch(() => {})
    dialogStore.sWavePredictVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '横波预测失败') : '横波预测失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'predict_vs', form.wellName, JSON.stringify({ method: form.method, dtCurve: form.dtCurve, resultName: form.resultName }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 12px 110px; line-height: 1.6;
}
</style>
