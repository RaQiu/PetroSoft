<template>
  <el-dialog
    v-model="dialogStore.fluidSubSimplifiedVisible"
    title="流体替换 - 简化模型"
    width="700px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-divider content-position="left">输入曲线</el-divider>
          <el-form-item label="孔隙度">
            <el-select v-model="form.phiCurve" size="small" style="width: 100%">
              <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="密度">
            <el-select v-model="form.denCurve" size="small" style="width: 100%">
              <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="VP">
            <el-select v-model="form.vpCurve" size="small" style="width: 100%">
              <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="VS">
            <el-select v-model="form.vsCurve" size="small" style="width: 100%">
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

          <el-divider content-position="left">SW 模式</el-divider>
          <el-form-item label="模式">
            <el-select v-model="form.swMode" size="small" style="width: 100%">
              <el-option label="迭代递增" value="iterate_add" />
              <el-option label="自定义范围" value="custom_range" />
              <el-option label="从曲线" value="from_curve" />
            </el-select>
          </el-form-item>
          <template v-if="form.swMode === 'iterate_add'">
            <el-form-item label="步长">
              <el-input-number v-model="form.swStep" :precision="2" :step="0.01" :min="0.01" :max="1" size="small" style="width: 100%" />
            </el-form-item>
            <el-form-item label="迭代次数">
              <el-input-number v-model="form.swIterations" :step="1" :min="1" :max="20" size="small" style="width: 100%" />
            </el-form-item>
          </template>
          <template v-else-if="form.swMode === 'custom_range'">
            <el-form-item label="起始 SW">
              <el-input-number v-model="form.swStart" :precision="2" :step="0.1" :min="0" :max="1" size="small" style="width: 100%" />
            </el-form-item>
            <el-form-item label="结束 SW">
              <el-input-number v-model="form.swEnd" :precision="2" :step="0.1" :min="0" :max="1" size="small" style="width: 100%" />
            </el-form-item>
            <el-form-item label="步数">
              <el-input-number v-model="form.swSteps" :step="1" :min="2" :max="20" size="small" style="width: 100%" />
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="目标 SW 曲线">
              <el-select v-model="form.targetSwCurve" size="small" style="width: 100%">
                <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
              </el-select>
            </el-form-item>
          </template>
        </el-col>

        <el-col :span="12">
          <el-divider content-position="left">砂岩骨架</el-divider>
          <el-form-item label="密度">
            <el-input-number v-model="form.sandRho" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VP (m/s)">
            <el-input-number v-model="form.sandVp" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VS (m/s)">
            <el-input-number v-model="form.sandVs" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>

          <el-divider content-position="left">泥岩骨架</el-divider>
          <el-form-item label="密度">
            <el-input-number v-model="form.shaleRho" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VP (m/s)">
            <el-input-number v-model="form.shaleVp" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="VS (m/s)">
            <el-input-number v-model="form.shaleVs" :precision="0" :step="100" size="small" style="width: 100%" />
          </el-form-item>

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
          <el-form-item label="油VP">
            <el-input-number v-model="form.oilVp" :precision="0" :step="50" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="水密度">
            <el-input-number v-model="form.waterRho" :precision="2" :step="0.01" size="small" style="width: 100%" />
          </el-form-item>
          <el-form-item label="水VP">
            <el-input-number v-model="form.waterVp" :precision="0" :step="50" size="small" style="width: 100%" />
          </el-form-item>

          <el-divider content-position="left">输出选项</el-divider>
          <el-form-item label="输出项">
            <el-checkbox-group v-model="form.outputItems">
              <el-checkbox label="VP">VP</el-checkbox>
              <el-checkbox label="VS">VS</el-checkbox>
              <el-checkbox label="RHOB">RHOB</el-checkbox>
              <el-checkbox label="K">K</el-checkbox>
              <el-checkbox label="Mu">Mu</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.fluidSubSimplifiedVisible = false">取消</el-button>
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
import { fluidSubSimplified } from '@/api/rockPhysics'
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
  denCurve: 'DEN',
  vpCurve: 'VP',
  vsCurve: 'VS',
  vshCurve: 'VSH',
  swCurve: 'SW',
  swMode: 'iterate_add',
  swStep: 0.05,
  swIterations: 5,
  swStart: 0,
  swEnd: 1,
  swSteps: 6,
  targetSwCurve: '',
  sandRho: 2.65,
  sandVp: 6040,
  sandVs: 4120,
  shaleRho: 2.6,
  shaleVp: 3410,
  shaleVs: 1630,
  fluidType: 'oil_water',
  oilRho: 0.8,
  oilVp: 1200,
  waterRho: 1.02,
  waterVp: 1600,
  outputItems: ['VP', 'VS', 'RHOB'] as string[]
})

const canSubmit = computed(() =>
  form.wellName && form.phiCurve && form.denCurve && form.vpCurve && form.vsCurve && form.vshCurve && form.swCurve && form.outputItems.length > 0
)

watch(() => dialogStore.fluidSubSimplifiedVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.phiCurve = 'PHI'
    form.denCurve = 'DEN'
    form.vpCurve = 'VP'
    form.vsCurve = 'VS'
    form.vshCurve = 'VSH'
    form.swCurve = 'SW'
    form.swMode = 'iterate_add'
    form.swStep = 0.05
    form.swIterations = 5
    form.swStart = 0
    form.swEnd = 1
    form.swSteps = 6
    form.targetSwCurve = ''
    form.sandRho = 2.65
    form.sandVp = 6040
    form.sandVs = 4120
    form.shaleRho = 2.6
    form.shaleVp = 3410
    form.shaleVs = 1630
    form.fluidType = 'oil_water'
    form.oilRho = 0.8
    form.oilVp = 1200
    form.waterRho = 1.02
    form.waterVp = 1600
    form.outputItems = ['VP', 'VS', 'RHOB']
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
    const res = await fluidSubSimplified(form.wellName, {
      workarea_path: workareaStore.path,
      phi_curve: form.phiCurve,
      den_curve: form.denCurve,
      vp_curve: form.vpCurve,
      vs_curve: form.vsCurve,
      vsh_curve: form.vshCurve,
      sw_curve: form.swCurve,
      sw_mode: form.swMode,
      sw_step: form.swStep,
      sw_iterations: form.swIterations,
      sw_start: form.swStart,
      sw_end: form.swEnd,
      sw_steps: form.swSteps,
      target_sw_curve: form.targetSwCurve,
      sand_rho: form.sandRho,
      sand_vp: form.sandVp,
      sand_vs: form.sandVs,
      shale_rho: form.shaleRho,
      shale_vp: form.shaleVp,
      shale_vs: form.shaleVs,
      fluid_type: form.fluidType,
      oil_rho: form.oilRho,
      oil_vp: form.oilVp,
      water_rho: form.waterRho,
      water_vp: form.waterVp,
      output_items: form.outputItems
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'fluid_sub_simplified', form.wellName, JSON.stringify({ swMode: form.swMode }), 'success', res.message).catch(() => {})
    dialogStore.fluidSubSimplifiedVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '流体替换(简化模型)失败') : '流体替换(简化模型)失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'fluid_sub_simplified', form.wellName, JSON.stringify({ swMode: form.swMode }), 'failed', errMsg).catch(() => {})
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
