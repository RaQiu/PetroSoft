<template>
  <el-dialog
    v-model="dialogStore.vshCalcVisible"
    title="计算泥质(粘土)含量"
    width="900px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="vsh-layout">
      <!-- Left: Well selection -->
      <div class="vsh-left">
        <div class="section-label">选择井</div>
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" filterable @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </div>

      <!-- Right: Method selection + parameters -->
      <div class="vsh-right">
        <el-radio-group v-model="form.method" class="method-radios">
          <el-radio value="single_curve">单曲线计算</el-radio>
          <el-radio value="neutron_sonic">中子-声波交会</el-radio>
          <el-radio value="neutron_density">中子-密度交会</el-radio>
          <el-radio value="density_sonic">密度-声波交会</el-radio>
        </el-radio-group>

        <div class="params-area">
          <!-- 单曲线法 -->
          <div v-show="form.method === 'single_curve'" class="param-group">
            <el-form label-width="100px" size="small">
              <el-form-item label="选择曲线">
                <el-select v-model="form.grCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="纯砂岩值">
                <el-input-number v-model="form.grClean" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <el-form-item label="纯泥岩值">
                <el-input-number v-model="form.grClay" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <el-form-item label="经验系数">
                <el-input-number v-model="form.regionalCoeff" :precision="1" :step="0.5" :min="1" style="width: 100%" />
              </el-form-item>
              <div class="param-hint">系数=1 线性, 2=Larionov老地层, 3.7=Larionov新地层</div>
            </el-form>
          </div>

          <!-- 中子-声波交会 -->
          <div v-show="form.method === 'neutron_sonic'" class="param-group">
            <el-form label-width="100px" size="small">
              <el-form-item label="中子曲线">
                <el-select v-model="form.cnlCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架中子值">
                <el-input-number v-model="form.cnlMatrix" :precision="3" :step="0.01" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质中子值">
                <el-input-number v-model="form.cnlClay" :precision="3" :step="0.01" style="width: 100%" />
              </el-form-item>
              <el-form-item label="声波曲线">
                <el-select v-model="form.dtCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架声波值">
                <el-input-number v-model="form.dtMatrix" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质声波值">
                <el-input-number v-model="form.dtClay" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <div class="param-hint">Vsh = min(Vsh_中子, Vsh_声波)</div>
            </el-form>
          </div>

          <!-- 中子-密度交会 -->
          <div v-show="form.method === 'neutron_density'" class="param-group">
            <el-form label-width="100px" size="small">
              <el-form-item label="中子曲线">
                <el-select v-model="form.cnlCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架中子值">
                <el-input-number v-model="form.cnlMatrix" :precision="3" :step="0.01" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质中子值">
                <el-input-number v-model="form.cnlClay" :precision="3" :step="0.01" style="width: 100%" />
              </el-form-item>
              <el-form-item label="密度曲线">
                <el-select v-model="form.denCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架密度">
                <el-input-number v-model="form.denMatrix" :precision="2" :step="0.05" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质密度">
                <el-input-number v-model="form.denClay" :precision="2" :step="0.05" style="width: 100%" />
              </el-form-item>
              <div class="param-hint">Vsh = min(Vsh_中子, Vsh_密度)</div>
            </el-form>
          </div>

          <!-- 密度-声波交会 -->
          <div v-show="form.method === 'density_sonic'" class="param-group">
            <el-form label-width="100px" size="small">
              <el-form-item label="密度曲线">
                <el-select v-model="form.denCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架密度">
                <el-input-number v-model="form.denMatrix" :precision="2" :step="0.05" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质密度">
                <el-input-number v-model="form.denClay" :precision="2" :step="0.05" style="width: 100%" />
              </el-form-item>
              <el-form-item label="声波曲线">
                <el-select v-model="form.dtCurve" style="width: 100%">
                  <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="骨架声波值">
                <el-input-number v-model="form.dtMatrix" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <el-form-item label="泥质声波值">
                <el-input-number v-model="form.dtClay" :precision="1" :step="5" style="width: 100%" />
              </el-form-item>
              <div class="param-hint">Vsh = min(Vsh_密度, Vsh_声波)</div>
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
      <el-button @click="dialogStore.vshCalcVisible = false">关闭</el-button>
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
import { calcVsh } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  method: 'single_curve',
  // 单曲线法
  grCurve: 'GR',
  grClean: 0,
  grClay: 100,
  regionalCoeff: 2.0,
  // 中子
  cnlCurve: 'CNL',
  cnlMatrix: -0.02,
  cnlClay: 0.28,
  // 声波
  dtCurve: 'DT',
  dtMatrix: 182,
  dtFluid: 620,
  dtClay: 328,
  // 密度
  denCurve: 'DEN',
  denMatrix: 2.65,
  denFluid: 1.0,
  denClay: 2.6,
  // 输出
  resultName: 'VSH',
  asPercent: false
})

const canSubmit = computed(() => form.wellName && form.resultName)

watch(() => dialogStore.vshCalcVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.resultName = 'VSH'
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
    const res = await calcVsh(form.wellName, {
      workarea_path: workareaStore.path,
      method: form.method,
      gr_curve: form.grCurve,
      gr_clean: form.grClean,
      gr_clay: form.grClay,
      regional_coeff: form.regionalCoeff,
      cnl_curve: form.cnlCurve,
      cnl_matrix: form.cnlMatrix,
      cnl_clay: form.cnlClay,
      dt_curve: form.dtCurve,
      dt_matrix: form.dtMatrix,
      dt_fluid: form.dtFluid,
      dt_clay: form.dtClay,
      den_curve: form.denCurve,
      den_matrix: form.denMatrix,
      den_fluid: form.denFluid,
      den_clay: form.denClay,
      result_curve_name: form.resultName,
      as_percent: form.asPercent
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'vsh', form.wellName, JSON.stringify({ method: form.method, resultName: form.resultName }), 'success', res.message).catch(() => {})
  } catch (e: unknown) {
    const axiosErr = e as { response?: { data?: { detail?: string } } }
    const errMsg = axiosErr.response?.data?.detail || '计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'vsh', form.wellName, JSON.stringify({ method: form.method, resultName: form.resultName }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.vsh-layout { display: flex; gap: 16px; min-height: 460px; }
.vsh-left {
  width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;
  border: 1px solid #dcdfe6; border-radius: 4px; padding: 12px;
}
.vsh-right { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.section-label { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 4px; }
.method-radios { display: flex; flex-wrap: wrap; gap: 8px; }
.params-area { flex: 1; overflow-y: auto; }
.param-group { border: 1px solid #ebeef5; border-radius: 4px; padding: 12px 8px 4px; }
.param-hint { font-size: 12px; color: #909399; padding: 0 0 8px 100px; }
.output-row { border-top: 1px solid #ebeef5; padding-top: 12px; }
</style>
