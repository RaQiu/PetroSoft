<template>
  <div class="data-import-view">
    <div class="view-header">
      <el-select v-model="filterType" placeholder="数据类型" style="width: 160px" size="small">
        <el-option label="全部" value="all" />
        <el-option label="井位" value="well" />
        <el-option label="曲线" value="curve" />
        <el-option label="分层/岩性/解释" value="geo" />
      </el-select>
      <el-button type="primary" size="small" :icon="Plus" @click="onImportClick">导入数据</el-button>
      <el-button size="small" :icon="Refresh" @click="loadData">刷新</el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="filteredData"
      stripe
      border
      style="width: 100%"
      empty-text="暂无数据，请导入"
    >
      <el-table-column prop="wellName" label="井名" width="140" />
      <el-table-column prop="dataType" label="数据类型" width="140" />
      <el-table-column prop="detail" label="数量" min-width="160" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellSummary } from '@/api/well'

interface DataRow {
  wellName: string
  dataType: string
  detail: string
  category: string // for filtering
}

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

const filterType = ref('all')
const loading = ref(false)
const tableData = ref<DataRow[]>([])

const filteredData = computed(() => {
  if (filterType.value === 'all') return tableData.value
  return tableData.value.filter((r) => r.category === filterType.value)
})

// Load data when workarea opens
watch(
  () => workareaStore.isOpen,
  (open) => {
    if (open) loadData()
    else tableData.value = []
  },
  { immediate: true }
)

// Refresh after import dialog closes (data may have been imported)
watch(
  () => dialogStore.importFileVisible,
  (visible, oldVisible) => {
    if (!visible && oldVisible && workareaStore.isOpen) {
      loadData()
    }
  }
)

async function loadData() {
  if (!workareaStore.isOpen) return
  loading.value = true
  try {
    await wellStore.fetchWells(workareaStore.path)
    const rows: DataRow[] = []

    if (wellStore.wells.length > 0) {
      rows.push({
        wellName: '—',
        dataType: '井位坐标',
        detail: `${wellStore.wells.length} 口井`,
        category: 'well'
      })
    }

    for (const well of wellStore.wells) {
      try {
        const summary = await getWellSummary(well.name, workareaStore.path)
        const counts = summary.data_counts as Record<string, number>
        if (counts['曲线'] > 0) {
          rows.push({
            wellName: well.name,
            dataType: '测井曲线',
            detail: `${counts['曲线']} 条`,
            category: 'curve'
          })
        }
        if (counts['轨迹'] > 0) {
          rows.push({
            wellName: well.name,
            dataType: '井轨迹',
            detail: `${counts['轨迹']} 条`,
            category: 'well'
          })
        }
        if (counts['分层'] > 0) {
          rows.push({
            wellName: well.name,
            dataType: '分层',
            detail: `${counts['分层']} 条`,
            category: 'geo'
          })
        }
        if (counts['岩性'] > 0) {
          rows.push({
            wellName: well.name,
            dataType: '岩性',
            detail: `${counts['岩性']} 条`,
            category: 'geo'
          })
        }
        if (counts['解释结论'] > 0) {
          rows.push({
            wellName: well.name,
            dataType: '解释结论',
            detail: `${counts['解释结论']} 条`,
            category: 'geo'
          })
        }
        if (counts['离散曲线'] > 0) {
          rows.push({
            wellName: well.name,
            dataType: '离散曲线',
            detail: `${counts['离散曲线']} 条`,
            category: 'curve'
          })
        }
      } catch {
        // skip individual well errors
      }
    }

    tableData.value = rows
  } catch {
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function onImportClick() {
  if (!workareaStore.isOpen) {
    ElMessage.warning('请先打开或创建工区')
    return
  }
  dialogStore.showImportFile()
}
</script>

<style scoped lang="scss">
.data-import-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
