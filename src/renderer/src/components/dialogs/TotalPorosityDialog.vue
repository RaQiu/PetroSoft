<template>
  <el-dialog
    v-model="dialogStore.totalPorosityVisible"
    title="总孔隙度计算"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" filterable @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="密度曲线">
        <el-select v-model="form.denCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="粘土含量曲线">
        <el-select v-model="form.vshCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="流体密度(g/cc)">
        <el-input-number v-model="form.denFluid" :precision="2" :step="0.1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="骨架密度(g/cc)">
        <el-input-number v-model="form.denMatrix" :precision="2" :step="0.05" style="width: 100%" />
      </el-form-item>
      <el-form-item label="粘土密度(g/cc)">
        <el-input-number v-model="form.denClay" :precision="2" :step="0.05" style="width: 100%" />
      </el-form-item>
      <el-form-item label="输出曲线名">
        <el-input v-model="form.resultName" style="width: 100%" />
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="form.asPercent">按百分数输出</el-checkbox>
      </el-form-item>
      <div class="method-help">
        PHIT = (DEN_ma - DEN) / (DEN_ma - DEN_fl) - Vsh * (DEN_ma - DEN_sh) / (DEN_ma - DEN_fl)
      </div>
    </el-form>

    <template #footer>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">应用并保存</el-button>
      <el-button @click="dialogStore.totalPorosityVisible = false">关闭</el-button>
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
import { calcTotalPorosity } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  denCurve: 'DEN',
  vshCurve: 'VSH',
  denFluid: 1.0,
  denMatrix: 2.65,
  denClay: 2.6,
  resultName: 'PHIT',
  asPercent: false
})

const canSubmit = computed(() => form.wellName && form.resultName)

watch(() => dialogStore.totalPorosityVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.resultName = 'PHIT'
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
    const res = await calcTotalPorosity(form.wellName, {
      workarea_path: workareaStore.path,
      den_curve: form.denCurve,
      vsh_curve: form.vshCurve,
      den_fluid: form.denFluid,
      den_matrix: form.denMatrix,
      den_clay: form.denClay,
      result_curve_name: form.resultName,
      as_percent: form.asPercent
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'total_porosity', form.wellName, JSON.stringify({ denCurve: form.denCurve, vshCurve: form.vshCurve, resultName: form.resultName }), 'success', res.message).catch(() => {})
  } catch (e: unknown) {
    const axiosErr = e as { response?: { data?: { detail?: string } } }
    const errMsg = axiosErr.response?.data?.detail || '计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'total_porosity', form.wellName, JSON.stringify({ denCurve: form.denCurve, vshCurve: form.vshCurve, resultName: form.resultName }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 8px 120px; font-family: monospace;
}
</style>
