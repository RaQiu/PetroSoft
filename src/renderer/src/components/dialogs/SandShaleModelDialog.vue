<template>
  <el-dialog
    v-model="dialogStore.sandShaleModelVisible"
    title="砂泥岩模型"
    width="700px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>

      <el-row :gutter="20">
        <!-- Left: Input curves -->
        <el-col :span="8">
          <el-divider content-position="left">输入曲线</el-divider>
          <el-form-item label="孔隙度">
            <el-select v-model="form.phiCurve" size="small" style="width: 100%">
              <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="泥质含量">
            <el-select v-model="form.vshCurve" size="small" style="width: 100%">
              <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="含水饱和度">
            <el-select v-model="form.swCurve" size="small" style="width: 100%">
              <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- Middle: Skeleton parameters -->
        <el-col :span="8">
          <el-divider content-position="left">砂岩参数</el-divider>
          <el-form-item label="密度">
            <el-input-number v-model="form.sandRho" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VP (m/s)">
            <el-input-number v-model="form.sandVp" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VS (m/s)">
            <el-input-number v-model="form.sandVs" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="纵横比">
            <el-input-number v-model="form.sandAspect" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>

          <el-divider content-position="left">泥岩参数</el-divider>
          <el-form-item label="密度">
            <el-input-number v-model="form.shaleRho" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VP (m/s)">
            <el-input-number v-model="form.shaleVp" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VS (m/s)">
            <el-input-number v-model="form.shaleVs" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="纵横比">
            <el-input-number v-model="form.shaleAspect" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
        </el-col>

        <!-- Right: Fluid + Output -->
        <el-col :span="8">
          <el-divider content-position="left">流体参数</el-divider>
          <el-form-item label="流体类型">
            <el-select v-model="form.fluidType" size="small" style="width: 100%">
              <el-option label="油水混合" value="oil_water" />
              <el-option label="气水" value="gas_water" />
            </el-select>
          </el-form-item>
          <el-form-item label="油密度">
            <el-input-number v-model="form.oilRho" :precision="2" :step="0.05" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="油VP (m/s)">
            <el-input-number v-model="form.oilVp" :precision="0" :step="50" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="水密度">
            <el-input-number v-model="form.waterRho" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="水VP (m/s)">
            <el-input-number v-model="form.waterVp" :precision="0" :step="50" size="small" style="width: 100%" />
          </el-form-item>

          <el-divider content-position="left">输出选项</el-divider>
          <el-form-item label="输出项">
            <el-checkbox-group v-model="form.outputItems">
              <el-checkbox label="VP_sm">VP</el-checkbox>
              <el-checkbox label="VS_sm">VS</el-checkbox>
              <el-checkbox label="RHOB_sm">RHOB</el-checkbox>
              <el-checkbox label="K_sm">K</el-checkbox>
              <el-checkbox label="Mu_sm">Mu</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.sandShaleModelVisible = false">取消</el-button>
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
import { sandShaleModel } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  phiCurve: 'PHI',
  vshCurve: 'VSH',
  swCurve: 'SW',
  sandRho: 2.65,
  sandVp: 6040,
  sandVs: 4120,
  sandAspect: 0.12,
  shaleRho: 2.6,
  shaleVp: 3410,
  shaleVs: 1630,
  shaleAspect: 0.03,
  fluidType: 'oil_water',
  oilRho: 0.8,
  oilVp: 1200,
  waterRho: 1.02,
  waterVp: 1600,
  outputItems: ['VP_sm', 'VS_sm', 'RHOB_sm'] as string[]
})

const canSubmit = computed(() => form.wellName && form.phiCurve && form.vshCurve && form.swCurve && form.outputItems.length > 0)

watch(() => dialogStore.sandShaleModelVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.phiCurve = 'PHI'
    form.vshCurve = 'VSH'
    form.swCurve = 'SW'
    form.sandRho = 2.65
    form.sandVp = 6040
    form.sandVs = 4120
    form.sandAspect = 0.12
    form.shaleRho = 2.6
    form.shaleVp = 3410
    form.shaleVs = 1630
    form.shaleAspect = 0.03
    form.fluidType = 'oil_water'
    form.oilRho = 0.8
    form.oilVp = 1200
    form.waterRho = 1.02
    form.waterVp = 1600
    form.outputItems = ['VP_sm', 'VS_sm', 'RHOB_sm']
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
    const res = await sandShaleModel(form.wellName, {
      workarea_path: workareaStore.path,
      phi_curve: form.phiCurve,
      vsh_curve: form.vshCurve,
      sw_curve: form.swCurve,
      sand_rho: form.sandRho,
      sand_vp: form.sandVp,
      sand_vs: form.sandVs,
      sand_aspect: form.sandAspect,
      shale_rho: form.shaleRho,
      shale_vp: form.shaleVp,
      shale_vs: form.shaleVs,
      shale_aspect: form.shaleAspect,
      fluid_type: form.fluidType,
      oil_rho: form.oilRho,
      oil_vp: form.oilVp,
      water_rho: form.waterRho,
      water_vp: form.waterVp,
      output_items: form.outputItems
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'sand_shale_model', form.wellName, JSON.stringify({ fluidType: form.fluidType }), 'success', res.message).catch(() => {})
    dialogStore.sandShaleModelVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '砂泥岩模型计算失败') : '砂泥岩模型计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'sand_shale_model', form.wellName, JSON.stringify({ fluidType: form.fluidType }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
:deep(.el-checkbox) {
  margin-right: 12px; margin-bottom: 4px;
}
:deep(.el-form-item) {
  margin-bottom: 12px;
}
</style>
