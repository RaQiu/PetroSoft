<template>
  <el-dialog
    v-model="dialogStore.segyBrowseVisible"
    title="SEG-Y 文件浏览"
    width="900px"
    top="3vh"
    :close-on-click-modal="false"
  >
    <div class="segy-browse">
      <div class="file-selector">
        <el-input v-model="filePath" placeholder="选择 SEG-Y 文件" readonly style="flex: 1">
          <template #prepend>文件路径</template>
        </el-input>
        <el-button type="primary" @click="selectFile">选择文件</el-button>
        <el-button :loading="loading" :disabled="!filePath" @click="loadHeaders">读取</el-button>
      </div>

      <el-tabs v-if="headerData" v-model="activeTab" style="margin-top: 12px">
        <el-tab-pane label="文本头" name="text">
          <pre class="text-header">{{ headerData.text_header }}</pre>
        </el-tab-pane>
        <el-tab-pane label="二进制头" name="binary">
          <el-table :data="binaryHeaderRows" size="small" max-height="480" border>
            <el-table-column prop="key" label="字段" width="280" />
            <el-table-column prop="value" label="值" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="道头预览" name="traces">
          <div class="trace-info">共 {{ headerData.total_traces.toLocaleString() }} 道</div>
          <el-table :data="headerData.sample_traces" size="small" max-height="440" border>
            <el-table-column prop="trace_index" label="道序号" width="80" />
            <el-table-column prop="INLINE_3D" label="Inline" width="100" />
            <el-table-column prop="CROSSLINE_3D" label="Crossline" width="100" />
            <el-table-column prop="CDP_X" label="CDP_X" width="120" />
            <el-table-column prop="CDP_Y" label="CDP_Y" width="120" />
            <el-table-column prop="TRACE_SAMPLE_COUNT" label="采样点数" width="100" />
            <el-table-column prop="SourceX" label="SourceX" />
            <el-table-column prop="SourceY" label="SourceY" />
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <el-empty v-else-if="!loading" description="选择 SEG-Y 文件后点击读取" />
    </div>

    <template #footer>
      <el-button @click="dialogStore.segyBrowseVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { browseSegyHeaders } from '@/api/seismic'
import type { SegyHeaderInfo } from '@/types/seismic'

const dialogStore = useDialogStore()

const filePath = ref('')
const loading = ref(false)
const headerData = ref<SegyHeaderInfo | null>(null)
const activeTab = ref('text')

const binaryHeaderRows = computed(() => {
  if (!headerData.value) return []
  return Object.entries(headerData.value.binary_header).map(([key, value]) => ({
    key,
    value
  }))
})

watch(
  () => dialogStore.segyBrowseVisible,
  (visible) => {
    if (visible) {
      filePath.value = ''
      headerData.value = null
      activeTab.value = 'text'
    }
  }
)

async function selectFile() {
  const result = await window.api.openFile([
    { name: 'SEG-Y 文件', extensions: ['sgy', 'segy'] }
  ])
  if (result.canceled || !result.filePaths.length) return
  filePath.value = result.filePaths[0]
}

async function loadHeaders() {
  if (!filePath.value) return
  loading.value = true
  headerData.value = null
  try {
    headerData.value = await browseSegyHeaders(filePath.value)
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(axiosErr.response?.data?.detail || '读取失败')
    } else {
      ElMessage.error('读取失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.segy-browse {
  min-height: 200px;
}
.file-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}
.text-header {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.4;
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  max-height: 480px;
  overflow: auto;
  white-space: pre;
  margin: 0;
}
.trace-info {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
</style>
