<template>
  <el-dialog
    v-model="dialogStore.reservoirParamsVisible"
    :title="dialogTitle"
    width="540px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>

      <el-form-item label="计算类型">
        <el-select v-model="form.calcType" style="width: 100%">
          <el-option label="渗透率 (Permeability)" value="permeability" />
          <el-option label="含水饱和度 (Sw)" value="saturation" />
        </el-select>
      </el-form-item>

      <!-- Permeability parameters -->
      <template v-if="form.calcType === 'permeability'">
        <el-form-item label="孔隙度曲线">
          <el-select v-model="form.permeability.phiCurve" placeholder="选择曲线" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="系数 a">
          <el-input-number v-model="form.permeability.coeffA" :precision="0" :step="100" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="指数 b">
          <el-input-number v-model="form.permeability.coeffB" :precision="1" :step="0.5" :min="0.1" style="width: 100%" />
        </el-form-item>
        <div class="method-help">K = a × PHI^b (经验公式，默认 K = 10000 × PHI³)</div>
      </template>

      <!-- Saturation parameters -->
      <template v-if="form.calcType === 'saturation'">
        <el-form-item label="电阻率曲线">
          <el-select v-model="form.saturation.rtCurve" placeholder="深电阻率" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="孔隙度曲线">
          <el-select v-model="form.saturation.phiCurve" placeholder="选择曲线" style="width: 100%">
            <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Rw (Ω·m)">
          <el-input-number v-model="form.saturation.rw" :precision="3" :step="0.01" :min="0.001" style="width: 100%" />
        </el-form-item>
        <el-form-item label="a (弯曲度)">
          <el-input-number v-model="form.saturation.a" :precision="2" :step="0.1" :min="0.1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="m (胶结指数)">
          <el-input-number v-model="form.saturation.m" :precision="2" :step="0.1" :min="0.5" style="width: 100%" />
        </el-form-item>
        <el-form-item label="n (饱和度指数)">
          <el-input-number v-model="form.saturation.n" :precision="2" :step="0.1" :min="0.5" style="width: 100%" />
        </el-form-item>
        <div class="method-help">Archie 公式: Sw = (a·Rw / (PHI^m · Rt))^(1/n)</div>
      </template>

      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.reservoirParamsVisible = false">取消</el-button>
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
import { calcPermeability, calcSaturation } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  calcType: 'permeability',
  resultName: '',
  permeability: { phiCurve: 'PHI', coeffA: 10000, coeffB: 3.0 },
  saturation: { rtCurve: 'RT', phiCurve: 'PHI', rw: 0.05, a: 1.0, m: 2.0, n: 2.0 }
})

const dialogTitle = computed(() => {
  const titles: Record<string, string> = {
    permeability: '渗透率计算',
    saturation: '含水饱和度计算'
  }
  return titles[form.calcType] || '储层参数计算'
})

const defaultResultNames: Record<string, string> = {
  permeability: 'PERM', saturation: 'SW'
}

const canSubmit = computed(() => form.wellName && form.resultName)

watch(() => dialogStore.reservoirParamsVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.resultName = ''
    availableCurves.value = []
    wellStore.fetchWells(workareaStore.path)
    if (dialogStore.reservoirParamsPresetType) {
      form.calcType = dialogStore.reservoirParamsPresetType
    }
    form.resultName = defaultResultNames[form.calcType] || ''
  }
})

watch(() => form.calcType, (t) => {
  form.resultName = defaultResultNames[t] || ''
})

async function onWellChange(wellName: string) {
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function onSubmit() {
  loading.value = true
  try {
    let res: { message: string }
    if (form.calcType === 'permeability') {
      res = await calcPermeability(form.wellName, {
        workarea_path: workareaStore.path,
        phi_curve: form.permeability.phiCurve,
        coeff_a: form.permeability.coeffA,
        coeff_b: form.permeability.coeffB,
        result_curve_name: form.resultName
      })
    } else {
      res = await calcSaturation(form.wellName, {
        workarea_path: workareaStore.path,
        rt_curve: form.saturation.rtCurve,
        phi_curve: form.saturation.phiCurve,
        rw: form.saturation.rw,
        a: form.saturation.a,
        m: form.saturation.m,
        n: form.saturation.n,
        result_curve_name: form.resultName
      })
    }
    ElMessage.success(res.message)
    const taskType = form.calcType === 'permeability' ? 'permeability' : 'saturation'
    createTask(workareaStore.path, taskType, form.wellName, JSON.stringify({ calcType: form.calcType, resultName: form.resultName }), 'success', res.message).catch(() => {})
    dialogStore.reservoirParamsVisible = false
  } catch (e: unknown) {
    let errMsg = '计算失败'
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      errMsg = axiosErr.response?.data?.detail || '计算失败'
    }
    ElMessage.error(errMsg)
    const taskType = form.calcType === 'permeability' ? 'permeability' : 'saturation'
    createTask(workareaStore.path, taskType, form.wellName, JSON.stringify({ calcType: form.calcType, resultName: form.resultName }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 8px 110px;
}
</style>
