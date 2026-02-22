<template>
  <el-dialog
    v-model="dialogStore.adaptiveModelVisible"
    title="自适应模型"
    width="540px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="岩性类型">
        <el-select v-model="form.rockType" style="width: 100%">
          <el-option label="砂泥岩" value="sand_shale" />
          <el-option label="碳酸盐岩" value="carbonate" />
        </el-select>
      </el-form-item>
      <el-form-item label="流体类型">
        <el-select v-model="form.fluidType" style="width: 100%">
          <el-option label="油水混合" value="oil_water" />
          <el-option label="气水" value="gas_water" />
          <el-option label="纯油" value="oil" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">输入曲线</el-divider>
      <el-form-item label="孔隙度曲线">
        <el-select v-model="form.phiCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="含水饱和度">
        <el-select v-model="form.swCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="声波曲线">
        <el-select v-model="form.dtCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="密度曲线">
        <el-select v-model="form.denCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">输出选项</el-divider>
      <el-form-item label="输出项目">
        <el-checkbox-group v-model="form.outputItems">
          <el-checkbox label="VP_em">VP</el-checkbox>
          <el-checkbox label="VS_em">VS</el-checkbox>
          <el-checkbox label="RHOB_em">RHOB</el-checkbox>
          <el-checkbox label="K_em">K (体积模量)</el-checkbox>
          <el-checkbox label="Mu_em">Mu (剪切模量)</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
    <div class="method-help">基于 Han/Castagna 经验关系计算弹性参数</div>

    <template #footer>
      <el-button @click="dialogStore.adaptiveModelVisible = false">取消</el-button>
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
import { adaptiveModel } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  rockType: 'sand_shale',
  fluidType: 'oil_water',
  phiCurve: 'PHI',
  swCurve: 'SW',
  dtCurve: 'DT',
  denCurve: 'DEN',
  outputItems: ['VP_em', 'VS_em', 'RHOB_em'] as string[]
})

const canSubmit = computed(() => form.wellName && form.phiCurve && form.swCurve && form.dtCurve && form.denCurve && form.outputItems.length > 0)

watch(() => dialogStore.adaptiveModelVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.rockType = 'sand_shale'
    form.fluidType = 'oil_water'
    form.phiCurve = 'PHI'
    form.swCurve = 'SW'
    form.dtCurve = 'DT'
    form.denCurve = 'DEN'
    form.outputItems = ['VP_em', 'VS_em', 'RHOB_em']
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
    const res = await adaptiveModel(form.wellName, {
      workarea_path: workareaStore.path,
      rock_type: form.rockType,
      fluid_type: form.fluidType,
      phi_curve: form.phiCurve,
      sw_curve: form.swCurve,
      dt_curve: form.dtCurve,
      den_curve: form.denCurve,
      output_items: form.outputItems
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'adaptive_model', form.wellName, JSON.stringify({ rockType: form.rockType, fluidType: form.fluidType }), 'success', res.message).catch(() => {})
    dialogStore.adaptiveModelVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '自适应模型计算失败') : '自适应模型计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'adaptive_model', form.wellName, JSON.stringify({ rockType: form.rockType, fluidType: form.fluidType }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 120px;
}
:deep(.el-checkbox) {
  margin-right: 16px; margin-bottom: 4px;
}
</style>
