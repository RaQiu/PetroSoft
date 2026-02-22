<template>
  <div class="task-manage">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filterType" placeholder="全部类型" size="small" clearable style="width: 140px">
          <el-option v-for="(label, key) in TASK_LABELS" :key="key" :label="label" :value="key" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="全部状态" size="small" clearable style="width: 120px">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-popconfirm title="确定清空全部任务记录？" @confirm="onClear">
          <template #reference>
            <el-button size="small" type="danger">清空记录</el-button>
          </template>
        </el-popconfirm>
        <el-button size="small" @click="fetchTasks">刷新</el-button>
      </div>
    </div>

    <el-table :data="tasks" border stripe style="width: 100%" v-loading="loading">
      <el-table-column label="时间" prop="created_at" width="170" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          {{ TASK_LABELS[row.task_type] || row.task_type }}
        </template>
      </el-table-column>
      <el-table-column label="井名" prop="well_name" width="120" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
            {{ row.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="结果" prop="result_message" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row)">查看</el-button>
          <el-button size="small" type="danger" @click="onDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 12px; justify-content: center"
      @current-change="fetchTasks"
    />

    <!-- Detail dialog -->
    <el-dialog v-model="detailVisible" title="任务详情" width="600px">
      <div v-if="detailTask" class="detail-content">
        <div class="detail-row"><span class="detail-label">类型:</span> {{ TASK_LABELS[detailTask.task_type] || detailTask.task_type }}</div>
        <div class="detail-row"><span class="detail-label">井名:</span> {{ detailTask.well_name }}</div>
        <div class="detail-row"><span class="detail-label">状态:</span> {{ detailTask.status === 'success' ? '成功' : '失败' }}</div>
        <div class="detail-row"><span class="detail-label">时间:</span> {{ detailTask.created_at }}</div>
        <div class="detail-row"><span class="detail-label">结果:</span> {{ detailTask.result_message }}</div>
        <div class="detail-row"><span class="detail-label">参数:</span></div>
        <pre class="detail-json">{{ formatJson(detailTask.params) }}</pre>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkareaStore } from '@/stores/workarea'
import { listTasks, deleteTask, clearTasks } from '@/api/task'
import type { TaskInfo } from '@/api/task'

const TASK_LABELS: Record<string, string> = {
  vsh: '泥质含量',
  porosity: '孔隙度',
  total_porosity: '总孔隙度',
  permeability: '渗透率',
  saturation: '含水饱和度',
  predict_vs: '横波预测',
  elastic: '弹性参数',
  fluid_sub: '流体替换'
}

const workareaStore = useWorkareaStore()
const loading = ref(false)
const tasks = ref<TaskInfo[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const filterType = ref('')
const filterStatus = ref('')
const detailVisible = ref(false)
const detailTask = ref<TaskInfo | null>(null)

watch(
  () => workareaStore.path,
  () => {
    if (workareaStore.isOpen) fetchTasks()
  },
  { immediate: true }
)

watch([filterType, filterStatus], () => {
  currentPage.value = 1
  fetchTasks()
})

async function fetchTasks() {
  if (!workareaStore.isOpen) return
  loading.value = true
  try {
    const res = await listTasks(
      workareaStore.path,
      currentPage.value,
      pageSize.value,
      filterType.value,
      filterStatus.value
    )
    tasks.value = res.tasks
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openDetail(task: TaskInfo) {
  detailTask.value = task
  detailVisible.value = true
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

async function onDelete(taskId: number) {
  try {
    await deleteTask(workareaStore.path, taskId)
    ElMessage.success('已删除')
    await fetchTasks()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function onClear() {
  try {
    await clearTasks(workareaStore.path)
    ElMessage.success('已清空')
    await fetchTasks()
  } catch {
    ElMessage.error('清空失败')
  }
}
</script>

<style scoped>
.task-manage {
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
.detail-content {
  font-size: 14px;
}
.detail-row {
  line-height: 2;
}
.detail-label {
  font-weight: 600;
  color: #303133;
}
.detail-json {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
