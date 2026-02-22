<template>
  <el-dialog
    v-model="dialogStore.elasticImpedanceVisible"
    title="计算弹性阻抗"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="VP 曲线">
        <el-select v-model="form.vpCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="VS 曲线">
        <el-select v-model="form.vsCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="密度曲线">
        <el-select v-model="form.denCurve" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">角度列表</el-divider>
      <div v-for="(item, index) in form.angles" :key="index" class="angle-row">
        <el-form-item :label="`角度 ${index + 1}`">
          <el-row :gutter="8" style="width: 100%">
            <el-col :span="8">
              <el-input-number v-model="item.angle" :precision="1" :step="5" :min="0" :max="60" size="small" style="width: 100%" />
            </el-col>
            <el-col :span="3"><span class="angle-label">°</span></el-col>
            <el-col :span="10">
              <el-input v-model="item.result_name" size="small" placeholder="输出名" />
            </el-col>
            <el-col :span="3">
              <el-button type="danger" size="small" :icon="Delete" circle @click="removeAngle(index)" :disabled="form.angles.length <= 1" />
            </el-col>
          </el-row>
        </el-form-item>
      </div>
      <el-form-item label="">
        <el-button type="primary" size="small" plain @click="addAngle">+ 添加角度</el-button>
      </el-form-item>
    </el-form>
    <div class="method-help">
      Connolly (1999): EI(θ) = VP^(1+tan²θ) × VS^(-8K·sin²θ) × ρ^(1-4K·sin²θ)
    </div>

    <template #footer>
      <el-button @click="dialogStore.elasticImpedanceVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">计算</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellCurves } from '@/api/well'
import { elasticImpedance } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  vpCurve: 'VP',
  vsCurve: 'VS',
  denCurve: 'DEN',
  angles: [{ angle: 15, result_name: 'EI_15' }] as { angle: number; result_name: string }[]
})

const canSubmit = computed(() =>
  form.wellName && form.vpCurve && form.vsCurve && form.denCurve &&
  form.angles.length > 0 && form.angles.every(a => a.result_name)
)

function addAngle() {
  const nextAngle = form.angles.length > 0 ? form.angles[form.angles.length - 1].angle + 5 : 15
  form.angles.push({ angle: nextAngle, result_name: `EI_${nextAngle}` })
}

function removeAngle(index: number) {
  form.angles.splice(index, 1)
}

watch(() => dialogStore.elasticImpedanceVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.vpCurve = 'VP'
    form.vsCurve = 'VS'
    form.denCurve = 'DEN'
    form.angles = [{ angle: 15, result_name: 'EI_15' }]
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
    const res = await elasticImpedance(form.wellName, {
      workarea_path: workareaStore.path,
      vp_curve: form.vpCurve,
      vs_curve: form.vsCurve,
      den_curve: form.denCurve,
      angles: form.angles
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'elastic_impedance', form.wellName, JSON.stringify({ angles: form.angles.map(a => a.angle) }), 'success', res.message).catch(() => {})
    dialogStore.elasticImpedanceVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '弹性阻抗计算失败') : '弹性阻抗计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'elastic_impedance', form.wellName, JSON.stringify({ angles: form.angles.map(a => a.angle) }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 120px; line-height: 1.6;
}
.angle-row {
  margin-bottom: 0;
}
.angle-label {
  line-height: 32px; display: inline-block;
}
</style>
