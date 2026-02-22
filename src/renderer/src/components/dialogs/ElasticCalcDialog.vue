<template>
  <el-dialog
    v-model="dialogStore.elasticCalcVisible"
    title="计算弹性参数"
    width="580px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="密度曲线">
        <el-select v-model="form.denCurve" placeholder="DEN" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="纵波速度曲线">
        <el-select v-model="form.dtCurve" placeholder="DT" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="横波速度曲线">
        <el-select v-model="form.dtsCurve" placeholder="DTS" style="width: 100%">
          <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="计算项目">
        <div class="calc-items-grid">
          <div v-for="item in calcItemDefs" :key="item.key" class="calc-item-row">
            <el-checkbox
              :model-value="form.calcItems.includes(item.key)"
              @change="(val: boolean) => toggleCalcItem(item.key, val)"
            >{{ item.label }}</el-checkbox>
            <el-input
              v-if="form.calcItems.includes(item.key)"
              v-model="form.customNames[item.key]"
              size="small"
              class="calc-item-name"
              :placeholder="item.key"
            />
          </div>
        </div>
      </el-form-item>
    </el-form>
    <div class="method-help">
      基于 Vp、Vs、密度计算弹性模量参数，结果保存为对应名称的曲线
    </div>

    <template #footer>
      <el-button @click="dialogStore.elasticCalcVisible = false">取消</el-button>
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
import { calcElasticParams } from '@/api/rockPhysics'
import { createTask } from '@/api/task'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const calcItemDefs = [
  { key: 'AI', label: '纵波阻抗 (AI)' },
  { key: 'SI', label: '横波阻抗 (SI)' },
  { key: 'VPVS', label: '纵横波速度比 (VP/VS)' },
  { key: 'PR', label: '泊松比 (PR)' },
  { key: 'E', label: '杨氏模量 (E)' },
  { key: 'K', label: '体积模量 (K)' },
  { key: 'Mu', label: '剪切模量 (Mu)' },
  { key: 'Lambda', label: '拉梅常数 (Lambda)' },
  { key: 'LambdaRhob', label: 'Lambda*Rho' },
  { key: 'MuRhob', label: 'Mu*Rho' }
]

const defaultItems = ['AI', 'SI', 'VPVS', 'PR', 'E', 'K', 'Mu', 'Lambda', 'LambdaRhob', 'MuRhob']

const form = reactive({
  wellName: '',
  dtCurve: 'DT',
  dtsCurve: 'DTS',
  denCurve: 'DEN',
  calcItems: [...defaultItems] as string[],
  customNames: {} as Record<string, string>
})

function toggleCalcItem(key: string, checked: boolean) {
  if (checked) {
    if (!form.calcItems.includes(key)) form.calcItems.push(key)
  } else {
    const idx = form.calcItems.indexOf(key)
    if (idx >= 0) form.calcItems.splice(idx, 1)
    delete form.customNames[key]
  }
}

const canSubmit = computed(() => form.wellName && form.dtCurve && form.dtsCurve && form.denCurve && form.calcItems.length > 0)

watch(() => dialogStore.elasticCalcVisible, (visible) => {
  if (visible && workareaStore.isOpen) {
    form.wellName = ''
    form.dtCurve = 'DT'
    form.dtsCurve = 'DTS'
    form.denCurve = 'DEN'
    form.calcItems = [...defaultItems]
    form.customNames = {}
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
    // Build custom_names: only include entries where user provided a non-empty custom name
    const customNames: Record<string, string> = {}
    for (const key of form.calcItems) {
      const name = form.customNames[key]
      if (name && name.trim()) {
        customNames[key] = name.trim()
      }
    }
    const res = await calcElasticParams(form.wellName, {
      workarea_path: workareaStore.path,
      dt_curve: form.dtCurve,
      dts_curve: form.dtsCurve,
      den_curve: form.denCurve,
      calc_items: form.calcItems,
      custom_names: Object.keys(customNames).length > 0 ? customNames : undefined
    })
    ElMessage.success(res.message)
    createTask(workareaStore.path, 'elastic', form.wellName, JSON.stringify({ calcItems: form.calcItems }), 'success', res.message).catch(() => {})
    dialogStore.elasticCalcVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '弹性参数计算失败') : '弹性参数计算失败'
    ElMessage.error(errMsg)
    createTask(workareaStore.path, 'elastic', form.wellName, JSON.stringify({ calcItems: form.calcItems }), 'failed', errMsg).catch(() => {})
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 110px;
}
.calc-items-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.calc-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.calc-item-name {
  width: 140px;
}
:deep(.el-checkbox) {
  min-width: 180px;
}
</style>
