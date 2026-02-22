<template>
  <el-dialog
    v-model="dialogStore.curveReconstructVisible"
    title="特征曲线重构"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="低频曲线">
        <el-select v-model="form.lowFreqCurve" placeholder="选择低频曲线" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="高频曲线">
        <el-select v-model="form.highFreqCurve" placeholder="选择高频曲线" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="处理选项">
        <el-checkbox v-model="form.invertHigh">反转高频</el-checkbox>
        <el-checkbox v-model="form.logHigh">取对数</el-checkbox>
      </el-form-item>
      <el-form-item label="方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option label="重构" value="reconstruct" />
          <el-option label="声波校正" value="sonic_correct" />
        </el-select>
      </el-form-item>
      <el-form-item label="校正系数">
        <el-input-number v-model="form.correctionFactor" :precision="2" :step="0.01" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="最大频率 (Hz)">
        <el-input-number v-model="form.maxFreq" :precision="0" :step="10" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" />
      </el-form-item>
    </el-form>
    <div class="method-help">
      重构: output = low + factor × processed_high<br>
      声波校正: output = low × (1 + factor × normalized_high)
    </div>

    <template #footer>
      <el-button @click="dialogStore.curveReconstructVisible = false">取消</el-button>
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
import { curveReconstruct } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  lowFreqCurve: '',
  highFreqCurve: '',
  method: 'reconstruct',
  maxFreq: 80,
  invertHigh: false,
  logHigh: false,
  correctionFactor: 0.1,
  resultName: 'RECON'
})

const canSubmit = computed(() => form.wellName && form.lowFreqCurve && form.highFreqCurve && form.resultName)

watch(() => dialogStore.curveReconstructVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.lowFreqCurve = ''
    form.highFreqCurve = ''
    form.method = 'reconstruct'
    form.maxFreq = 80
    form.invertHigh = false
    form.logHigh = false
    form.correctionFactor = 0.1
    form.resultName = 'RECON'
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
    const res = await curveReconstruct(form.wellName, {
      workarea_path: workareaStore.path,
      low_freq_curve: form.lowFreqCurve,
      high_freq_curve: form.highFreqCurve,
      method: form.method,
      max_freq: form.maxFreq,
      invert_high: form.invertHigh,
      log_high: form.logHigh,
      correction_factor: form.correctionFactor,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'curve_reconstruct', form.wellName, JSON.stringify({ method: form.method }), 'success', res.message).catch(() => {})
    dialogStore.curveReconstructVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '特征曲线重构失败') : '特征曲线重构失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'curve_reconstruct', form.wellName, JSON.stringify({ method: form.method }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 120px; line-height: 1.6;
}
</style>
