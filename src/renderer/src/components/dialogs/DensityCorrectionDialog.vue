<template>
  <el-dialog
    v-model="dialogStore.densityCorrectionVisible"
    title="校正密度曲线"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="VP 曲线">
        <el-select v-model="form.vpCurve" placeholder="VP" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="岩性">
        <el-select v-model="form.lithology" style="width: 100%" @change="onLithologyChange">
          <el-option label="泥岩" value="泥岩" />
          <el-option label="砂岩" value="砂岩" />
          <el-option label="石灰岩" value="石灰岩" />
        </el-select>
      </el-form-item>
      <el-form-item label="方法">
        <el-select v-model="form.method" style="width: 100%">
          <el-option label="Castagna" value="castagna" />
          <el-option label="Gardner" value="gardner" />
        </el-select>
      </el-form-item>

      <template v-if="form.method === 'castagna'">
        <el-form-item label="系数 A">
          <el-input-number v-model="form.a" :precision="4" :step="0.001" style="width: 100%" />
        </el-form-item>
        <el-form-item label="系数 B">
          <el-input-number v-model="form.b" :precision="3" :step="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="系数 C">
          <el-input-number v-model="form.c" :precision="3" :step="0.01" style="width: 100%" />
        </el-form-item>
        <div class="method-help">RHOB = A×(VP/1000)² + B×(VP/1000) + C</div>
      </template>
      <template v-else>
        <el-form-item label="系数 D">
          <el-input-number v-model="form.d" :precision="2" :step="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="系数 F">
          <el-input-number v-model="form.f" :precision="3" :step="0.01" style="width: 100%" />
        </el-form-item>
        <div class="method-help">RHOB = D × VP^F</div>
      </template>

      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogStore.densityCorrectionVisible = false">取消</el-button>
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
import { correctDensity } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const lithologyPresets: Record<string, { a: number; b: number; c: number }> = {
  '泥岩': { a: -0.0261, b: 0.373, c: 1.458 },
  '砂岩': { a: -0.0115, b: 0.261, c: 1.515 },
  '石灰岩': { a: -0.0296, b: 0.461, c: 0.963 }
}

const form = reactive({
  wellName: '',
  vpCurve: 'VP',
  lithology: '泥岩',
  method: 'castagna',
  a: -0.0261,
  b: 0.373,
  c: 1.458,
  d: 1.75,
  f: 0.265,
  resultName: 'RHOB_Casta'
})

const canSubmit = computed(() => form.wellName && form.vpCurve && form.resultName)

function onLithologyChange(val: string) {
  const p = lithologyPresets[val]
  if (p) {
    form.a = p.a
    form.b = p.b
    form.c = p.c
  }
}

watch(() => dialogStore.densityCorrectionVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.vpCurve = 'VP'
    form.lithology = '泥岩'
    form.method = 'castagna'
    form.a = -0.0261
    form.b = 0.373
    form.c = 1.458
    form.d = 1.75
    form.f = 0.265
    form.resultName = 'RHOB_Casta'
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
    const res = await correctDensity(form.wellName, {
      workarea_path: workareaStore.path,
      method: form.method,
      vp_curve: form.vpCurve,
      lithology: form.lithology,
      a: form.a,
      b: form.b,
      c: form.c,
      d: form.d,
      f: form.f,
      result_curve_name: form.resultName
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'correct_density', form.wellName, JSON.stringify({ method: form.method, lithology: form.lithology }), 'success', res.message).catch(() => {})
    dialogStore.densityCorrectionVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '密度校正失败') : '密度校正失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'correct_density', form.wellName, JSON.stringify({ method: form.method, lithology: form.lithology }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 12px 120px;
}
</style>
