<template>
  <el-dialog
    v-model="dialogStore.wellDataQueryVisible"
    title="查询井数据"
    width="950px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="query-toolbar">
      <el-select v-model="selectedWell" placeholder="选择井" style="width: 140px" @change="onWellChange">
        <el-option v-for="w in wellStore.wells" :key="w.name" :label="w.name" :value="w.name" />
      </el-select>
      <el-select v-model="selectedCurves" multiple placeholder="选择曲线" style="width: 300px" collapse-tags>
        <el-option v-for="c in availableCurves" :key="c.name" :label="c.name" :value="c.name" />
      </el-select>
      <el-input-number v-model="depthMin" placeholder="最小深度" :controls="false" style="width: 100px" />
      <span style="color: #909399">~</span>
      <el-input-number v-model="depthMax" placeholder="最大深度" :controls="false" style="width: 100px" />
      <el-button type="primary" :loading="loading" :disabled="!selectedWell" @click="query">查询</el-button>
    </div>
    <el-table :data="tableData" border stripe height="450" style="width: 100%; margin-top: 12px">
      <el-table-column
        v-for="col in columns"
        :key="col"
        :prop="col"
        :label="col"
        :width="col === '深度' ? 120 : undefined"
        :formatter="(_, __, val) => val != null ? Number(val).toFixed(3) : '—'"
      />
    </el-table>
    <div class="query-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="query"
      />
    </div>
    <template #footer>
      <el-button @click="dialogStore.wellDataQueryVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellCurves } from '@/api/well'
import { queryWellData } from '@/api/query'
import type { CurveInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

const selectedWell = ref('')
const selectedCurves = ref<string[]>([])
const availableCurves = ref<CurveInfo[]>([])
const depthMin = ref<number | undefined>(undefined)
const depthMax = ref<number | undefined>(undefined)
const loading = ref(false)
const columns = ref<string[]>([])
const tableData = ref<Record<string, number | null>[]>([])
const currentPage = ref(1)
const pageSize = 100
const total = ref(0)

watch(
  () => dialogStore.wellDataQueryVisible,
  (visible) => {
    if (visible && workareaStore.isOpen) {
      selectedWell.value = ''
      selectedCurves.value = []
      availableCurves.value = []
      depthMin.value = undefined
      depthMax.value = undefined
      columns.value = []
      tableData.value = []
      currentPage.value = 1
      total.value = 0
      wellStore.fetchWells(workareaStore.path)
    }
  }
)

async function onWellChange(wellName: string) {
  selectedCurves.value = []
  columns.value = []
  tableData.value = []
  total.value = 0
  currentPage.value = 1
  if (!wellName) { availableCurves.value = []; return }
  availableCurves.value = await getWellCurves(wellName, workareaStore.path)
}

async function query() {
  if (!selectedWell.value) return
  loading.value = true
  try {
    const result = await queryWellData(selectedWell.value, {
      workarea: workareaStore.path,
      curves: selectedCurves.value.join(','),
      depth_min: depthMin.value,
      depth_max: depthMax.value,
      page: currentPage.value,
      page_size: pageSize
    })
    columns.value = result.columns
    total.value = result.total
    tableData.value = result.rows.map((row) => {
      const obj: Record<string, number | null> = {}
      result.columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })
  } catch {
    columns.value = []
    tableData.value = []
    total.value = 0
    ElMessage.warning('查询数据失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.query-toolbar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.query-pagination {
  display: flex; justify-content: flex-end; margin-top: 12px;
}
</style>
