<template>
  <el-dialog
    v-model="dialogStore.porosityCalcVisible"
    title="计算孔隙度"
    width="900px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="por-layout">
      <!-- Left: Well selection -->
      <div class="por-left">
        <div class="section-label">选择井</div>
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" filterable @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </div>

      <!-- Right: Method selection + parameters -->
      <div class="por-right">
        <el-radio-group v-model="form.method" class="method-radios">
          <el-radio value="sonic">声波时差计算</el-radio>
          <el-radio value="density">密度计算</el-radio>
          <el-radio value="neutron">补偿中子计算</el-radio>
          <el-radio value="neutron_density_mean">中子-密度几何平均</el-radio>
        </el-radio-group>

        <div class="params-area">
          <!-- 声波时差法 -->
          <div v-show="form.method === 'sonic'" class="param-group">
            <el-form label-width="110px" size="small">
              <el-form-item label="声波曲线">
                <el-select v-model="form.dtCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架声波(us/m)">
                <el-input-number v-model="form.dtMatrix" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <el-form-item label="流体声波(us/m)">
                <el-input-number v-model="form.dtFluid" :precision="1" :step="10" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质声波(us/m)">
                <el-input-number v-model="form.dtClay" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <el-form-item label="压实校正系数">
                <el-input-number v-model="form.compactionFactor" :precision="2" :step="0.1" :min="0.5" :max="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质含量曲线">
                <el-select v-model="form.vshCurve" clearable style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="泥质截止值">
                <el-input-number v-model="form.vshCutoff" :precision="2" :step="0.05" :min="0" :max="1" style="width: 100%" />
              </el-form-item>
            </el-form>
          </div>

          <!-- 密度法 -->
          <div v-show="form.method === 'density'" class="param-group">
            <el-form label-width="110px" size="small">
              <el-form-item label="密度曲线">
                <el-select v-model="form.denCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架密度(g/cc)">
                <el-input-number v-model="form.denMatrix" :precision="2" :step="0.05" style="width: 100%" />
              </el-form-item>
              <el-form-item label="流体密度(g/cc)">
                <el-input-number v-model="form.denFluid" :precision="2" :step="0.1" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质密度(g/cc)">
                <el-input-number v-model="form.denClay" :precision="2" :step="0.05" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质含量曲线">
                <el-select v-model="form.vshCurve" clearable style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="泥质截止值">
                <el-input-number v-model="form.vshCutoff" :precision="2" :step="0.05" :min="0" :max="1" style="width: 100%" />
              </el-form-item>
            </el-form>
          </div>

          <!-- 补偿中子法 -->
          <div v-show="form.method === 'neutron'" class="param-group">
            <el-form label-width="110px" size="small">
              <el-form-item label="中子曲线">
                <el-select v-model="form.cnlCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="泥质中子值">
                <el-input-number v-model="form.cnlClay" :precision="3" :step="0.01" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质含量曲线">
                <el-select v-model="form.vshCurve" clearable style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="泥质截止值">
                <el-input-number v-model="form.vshCutoff" :precision="2" :step="0.05" :min="0" :max="1" style="width: 100%" />
              </el-form-item>
            </el-form>
          </div>

          <!-- 中子-密度几何平均 -->
          <div v-show="form.method === 'neutron_density_mean'" class="param-group">
            <el-form label-width="130px" size="small">
              <el-form-item label="中子孔隙度曲线">
                <el-select v-model="form.phiNeutronCurve" placeholder="选择曲线" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="密度孔隙度曲线">
                <el-select v-model="form.phiDensityCurve" placeholder="选择曲线" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <div class="param-hint">PHI = sqrt(PHI_N * PHI_D)，需先计算两条孔隙度曲线</div>
            </el-form>
          </div>
        </div>

        <!-- Output section -->
        <div class="output-row">
          <el-form label-width="100px" size="small" inline>
            <el-form-item label="输出曲线名">
              <el-input v-model="form.resultName" style="width: 140px" />
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="form.asPercent">按百分数输出</el-checkbox>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">应用并保存</el-button>
      <el-button @click="dialogStore.porosityCalcVisible = false">关闭</el-button>
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
import { calcPorosity } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  method: 'sonic',
  // 声波
  dtCurve: 'DT',
  dtMatrix: 182,
  dtFluid: 620,
  dtClay: 328,
  compactionFactor: 1.0,
  // 密度
  denCurve: 'DEN',
  denMatrix: 2.65,
  denFluid: 1.0,
  denClay: 2.6,
  // 中子
  cnlCurve: 'CNL',
  cnlClay: 0.28,
  // 泥质校正
  vshCurve: 'VSH',
  vshCutoff: 0.4,
  // 中子-密度几何平均
  phiNeutronCurve: '',
  phiDensityCurve: '',
  // 输出
  resultName: 'POR',
  asPercent: false
})

const canSubmit = computed(() => form.wellName && form.resultName)

watch(() => dialogStore.porosityCalcVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.resultName = 'POR'
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
    const res = await calcPorosity(form.wellName, {
      workarea_path: workareaStore.path,
      method: form.method,
      dt_curve: form.dtCurve,
      dt_matrix: form.dtMatrix,
      dt_fluid: form.dtFluid,
      dt_clay: form.dtClay,
      compaction_factor: form.compactionFactor,
      den_curve: form.denCurve,
      den_matrix: form.denMatrix,
      den_fluid: form.denFluid,
      den_clay: form.denClay,
      cnl_curve: form.cnlCurve,
      cnl_clay: form.cnlClay,
      vsh_curve: form.vshCurve,
      vsh_cutoff: form.vshCutoff,
      phi_neutron_curve: form.phiNeutronCurve,
      phi_density_curve: form.phiDensityCurve,
      result_curve_name: form.resultName,
      as_percent: form.asPercent
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'porosity', form.wellName, JSON.stringify({ method: form.method, resultName: form.resultName }), 'success', res.message).catch(() => {})
  } catch (e: unknown) {
    const axiosErr = e as { response?: { data?: { detail?: string } } }
    const errMsg = axiosErr.response?.data?.detail || '计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'porosity', form.wellName, JSON.stringify({ method: form.method, resultName: form.resultName }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.por-layout { display: flex; gap: 16px; min-height: 460px; }
.por-left {
  width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px;
}
.por-right { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.section-label { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 4px; }
.method-radios { display: flex; flex-wrap: wrap; gap: 8px; }
.params-area { flex: 1; overflow-y: auto; }
.param-group { border: 1px solid #ebeef5; border-radius: 4px; padding: 12px 8px 4px; }
.param-hint { font-size: 12px; color: #909399; padding: 0 0 8px 110px; }
.output-row { border-top: 1px solid #ebeef5; padding-top: 12px; }
</style>
