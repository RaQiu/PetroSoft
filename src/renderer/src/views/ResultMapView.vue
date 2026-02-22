<template>
  <div class="result-map">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filterType" placeholder="全部类型" size="small" clearable style="width: 140px">
          <el-option label="直方图" value="histogram" />
          <el-option label="交会图" value="crossplot" />
        </el-select>
        <el-input v-model="searchText" placeholder="搜索名称" size="small" clearable style="width: 200px" />
      </div>
      <el-button size="small" @click="fetchCharts">刷新</el-button>
    </div>

    <div v-if="filteredCharts.length > 0" class="chart-grid" v-loading="loading">
      <el-card
        v-for="chart in filteredCharts"
        :key="chart.id"
        class="chart-card"
        :body-style="{ padding: '0' }"
        shadow="hover"
      >
        <div class="card-thumb" @click="previewChart(chart)">
          <img v-if="thumbnails[chart.id]" :src="thumbnails[chart.id]" alt="缩略图" />
          <el-icon v-else :size="48" class="thumb-placeholder"><Picture /></el-icon>
        </div>
        <div class="card-info">
          <div class="card-name" :title="chart.name">{{ chart.name }}</div>
          <div class="card-meta">
            <el-tag size="small" type="info">{{ CHART_LABELS[chart.chart_type] || chart.chart_type }}</el-tag>
            <span class="card-date">{{ chart.created_at?.slice(0, 10) }}</span>
          </div>
          <div class="card-actions">
            <el-button size="small" @click="exportChart(chart)">导出</el-button>
            <el-popconfirm title="确定删除此成果图？" @confirm="onDelete(chart.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty v-else-if="!loading" description="暂无成果图" />

    <!-- Preview dialog -->
    <el-dialog v-model="previewVisible" title="成果图预览" width="80%" top="3vh">
      <div class="preview-container">
        <img v-if="previewSrc" :src="previewSrc" alt="预览" class="preview-img" />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { useWorkareaStore } from '@/stores/workarea'
import { listCharts, getChart, deleteChart } from '@/api/chart'
import type { ChartInfo } from '@/api/chart'

const CHART_LABELS: Record<string, string> = {
  histogram: '直方图',
  crossplot: '交会图'
}

const workareaStore = useWorkareaStore()
const loading = ref(false)
const charts = ref<ChartInfo[]>([])
const thumbnails = ref<Record<number, string>>({})
const filterType = ref('')
const searchText = ref('')
const previewVisible = ref(false)
const previewSrc = ref('')

const filteredCharts = computed(() => {
  let result = charts.value
  if (filterType.value) {
    result = result.filter((c) => c.chart_type === filterType.value)
  }
  if (searchText.value) {
    const s = searchText.value.toLowerCase()
    result = result.filter((c) => c.name.toLowerCase().includes(s))
  }
  return result
})

watch(
  () => workareaStore.path,
  () => {
    if (workareaStore.isOpen) fetchCharts()
  },
  { immediate: true }
)

async function fetchCharts() {
  if (!workareaStore.isOpen) return
  loading.value = true
  try {
    charts.value = await listCharts(workareaStore.path)
    // Load thumbnails
    thumbnails.value = {}
    for (const c of charts.value) {
      loadThumbnail(c.id)
    }
  } finally {
    loading.value = false
  }
}

async function loadThumbnail(chartId: number) {
  try {
    const detail = await getChart(workareaStore.path, chartId)
    if (detail.thumbnail) {
      thumbnails.value = { ...thumbnails.value, [chartId]: detail.thumbnail }
    }
  } catch {
    // ignore
  }
}

async function previewChart(chart: ChartInfo) {
  try {
    const detail = await getChart(workareaStore.path, chart.id)
    previewSrc.value = detail.thumbnail || ''
    previewVisible.value = true
  } catch {
    ElMessage.error('加载预览失败')
  }
}

async function exportChart(chart: ChartInfo) {
  try {
    const detail = await getChart(workareaStore.path, chart.id)
    if (!detail.thumbnail) {
      ElMessage.warning('无缩略图可导出')
      return
    }
    const a = document.createElement('a')
    a.href = detail.thumbnail
    a.download = `${chart.name}.png`
    a.click()
    ElMessage.success('已导出')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function onDelete(chartId: number) {
  try {
    await deleteChart(workareaStore.path, chartId)
    ElMessage.success('已删除')
    await fetchCharts()
  } catch {
    ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.result-map {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toolbar-left {
  display: flex;
  gap: 8px;
}
.chart-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}
.chart-card {
  width: 220px;
  flex-shrink: 0;
}
.card-thumb {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  cursor: pointer;
  overflow: hidden;
}
.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.thumb-placeholder {
  color: #c0c4cc;
}
.card-info {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}
.card-actions {
  display: flex;
  gap: 6px;
}
.preview-container {
  display: flex;
  justify-content: center;
  max-height: calc(90vh - 160px);
  overflow: auto;
}
.preview-img {
  max-width: 100%;
  max-height: calc(90vh - 160px);
  object-fit: contain;
}
</style>
