<template>
  <el-dialog
    v-model="dialogStore.fluidSubVisible"
    title="Gassmann 流体替换"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="130px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">输入曲线</el-divider>
      <el-form-item label="纵波曲线 (DT)">
        <el-select v-model="form.dtCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="横波曲线 (DTS)">
        <el-select v-model="form.dtsCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="密度曲线 (DEN)">
        <el-select v-model="form.denCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="孔隙度曲线 (PHI)">
        <el-select v-model="form.phiCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">岩石骨架参数</el-divider>
      <el-form-item label="骨架模量 K (GPa)">
        <el-input-number v-model="form.kMineral" :precision="1" :step="1" :min="1" style="width: 100%" />
      </el-form-item>

      <el-divider content-position="left">原始流体</el-divider>
      <el-form-item label="体积模量 (GPa)">
        <el-input-number v-model="form.kFluidOrig" :precision="2" :step="0.1" :min="0.01" style="width: 100%" />
      </el-form-item>
      <el-form-item label="密度 (g/cc)">
        <el-input-number v-model="form.rhoFluidOrig" :precision="2" :step="0.05" :min="0.01" style="width: 100%" />
      </el-form-item>

      <el-divider content-position="left">替换流体</el-divider>
      <el-form-item label="流体预设">
        <el-select v-model="fluidPreset" style="width: 100%" @change="onPresetChange">
          <el-option label="油 (Oil)" value="oil" />
          <el-option label="气 (Gas)" value="gas" />
          <el-option label="盐水 (Brine)" value="brine" />
          <el-option label="自定义" value="custom" />
        </el-select>
      </el-form-item>
      <el-form-item label="体积模量 (GPa)">
        <el-input-number v-model="form.kFluidNew" :precision="2" :step="0.1" :min="0.01" style="width: 100%" />
      </el-form-item>
      <el-form-item label="密度 (g/cc)">
        <el-input-number v-model="form.rhoFluidNew" :precision="2" :step="0.05" :min="0.01" style="width: 100%" />
      </el-form-item>

      <el-divider content-position="left">输出曲线</el-divider>
      <el-form-item label="结果 DT 曲线">
        <el-input v-model="form.resultDt" />
      </el-form-item>
      <el-form-item label="结果 DEN 曲线">
        <el-input v-model="form.resultDen" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.fluidSubVisible = false">取消</el-button>
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
import { fluidSubstitution } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])
const fluidPreset = ref('oil')

const form = reactive({
  wellName: '',
  dtCurve: 'DT',
  dtsCurve: 'DTS',
  denCurve: 'DEN',
  phiCurve: 'PHI',
  kMineral: 38.0,
  kFluidOrig: 2.2,
  rhoFluidOrig: 1.05,
  kFluidNew: 0.7,
  rhoFluidNew: 0.8,
  resultDt: 'DT_FS',
  resultDen: 'DEN_FS'
})

const presets: Record<string, { k: number; rho: number }> = {
  oil: { k: 0.7, rho: 0.8 },
  gas: { k: 0.02, rho: 0.15 },
  brine: { k: 2.2, rho: 1.05 }
}

function onPresetChange(val: string) {
  const p = presets[val]
  if (p) {
    form.kFluidNew = p.k
    form.rhoFluidNew = p.rho
  }
}

const canSubmit = computed(() =>
  form.wellName && form.dtCurve && form.dtsCurve && form.denCurve && form.phiCurve && form.resultDt && form.resultDen
)

watch(() => dialogStore.fluidSubVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.dtCurve = 'DT'
    form.dtsCurve = 'DTS'
    form.denCurve = 'DEN'
    form.phiCurve = 'PHI'
    form.kMineral = 38.0
    form.kFluidOrig = 2.2
    form.rhoFluidOrig = 1.05
    form.kFluidNew = 0.7
    form.rhoFluidNew = 0.8
    form.resultDt = 'DT_FS'
    form.resultDen = 'DEN_FS'
    fluidPreset.value = 'oil'
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
    const res = await fluidSubstitution(form.wellName, {
      workarea_path: workareaStore.path,
      dt_curve: form.dtCurve,
      dts_curve: form.dtsCurve,
      den_curve: form.denCurve,
      phi_curve: form.phiCurve,
      k_mineral: form.kMineral,
      k_fluid_orig: form.kFluidOrig,
      rho_fluid_orig: form.rhoFluidOrig,
      k_fluid_new: form.kFluidNew,
      rho_fluid_new: form.rhoFluidNew,
      result_dt: form.resultDt,
      result_den: form.resultDen
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'fluid_sub', form.wellName, JSON.stringify({ resultDt: form.resultDt, resultDen: form.resultDen }), 'success', res.message).catch(() => {})
    dialogStore.fluidSubVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '流体替换失败') : '流体替换失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'fluid_sub', form.wellName, JSON.stringify({ resultDt: form.resultDt, resultDen: form.resultDen }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>
