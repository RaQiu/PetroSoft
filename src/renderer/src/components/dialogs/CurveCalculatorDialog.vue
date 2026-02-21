<template>
  <el-dialog
    v-model="dialogStore.curveCalculatorVisible"
    title="曲线计算器"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="选择井">
        <el-select v-model="form.wellName" placeholder="选择井" style="width: 100%" @change="onWellChange">
          <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="可用曲线">
        <div class="curve-tags">
          <el-tag
            v-for="c in availableCurves"
            :key="c.name"
            class="curve-tag"
            @click="insertCurveName(c.name)"
          >
            {{ c.name }}
          </el-tag>
          <span v-if="availableCurves.length === 0" class="no-curves">请先选择井</span>
        </div>
      </el-form-item>
      <el-form-item label="计算表达式">
        <el-input
          ref="exprInput"
          v-model="form.expression"
          type="textarea"
          :rows="3"
          placeholder="例如: GR * 0.5 + DT  或  log(DEN)"
        />
      </el-form-item>
      <el-form-item label="结果曲线名">
        <el-input v-model="form.resultName" placeholder="新曲线名称" />
      </el-form-item>
      <el-form-item label="单位">
        <el-input v-model="form.resultUnit" placeholder="可选" />
      </el-form-item>
    </el-form>
    <div class="calc-help">
      支持运算: + - * / **  |  函数: log, log10, sqrt, abs, sin, cos, exp, min, max
    </div>
    <template #footer>
      <el-button @click="dialogStore.curveCalculatorVisible = false">取消</el-button>
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
import { calculateCurve } from '@/api/calculator'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()
const loading = ref(false)
const availableCurves = ref<CurveInfo[]>([])

const form = reactive({
  wellName: '',
  expression: '',
  resultName: '',
  resultUnit: ''
})

const canSubmit = computed(() => form.wellName && form.expression && form.resultName)

watch(() => dialogStore.curveCalculatorVisible, (visible) => {
  if (visible && workareaStore.isOpen) wellStore.fetchWells(workareaStore.path)
})

async function onWellChange(wellName: string) {
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

function insertCurveName(name: string) {
  form.expression += name
}

async function onSubmit() {
  loading.value = true
  try {
    const res = await calculateCurve(form.wellName, {
      workarea_path: workareaStore.path,
      expression: form.expression,
      result_curve_name: form.resultName,
      result_unit: form.resultUnit
    })
    ElMessage.success(res.message)
    dialogStore.curveCalculatorVisible = false
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '计算失败')
    } else {
      ElMessage.error('计算失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.curve-tags {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.curve-tag {
  cursor: pointer;
}
.curve-tag:hover {
  opacity: 0.8;
}
.no-curves {
  color: #909399; font-size: 13px;
}
.calc-help {
  font-size: 12px; color: #909399; padding: 4px 0 0 100px;
}
</style>
