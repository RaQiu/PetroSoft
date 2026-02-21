<template>
  <el-dialog
    v-model="dialogStore.dataManageVisible"
    title="数据管理"
    width="900px"
    top="5vh"
    :close-on-click-modal="false"
  >
    <div class="data-manage-container">
      <div class="data-manage-left">
        <el-tree
          :data="treeData"
          :props="{ label: 'label', children: 'children' }"
          highlight-current
          default-expand-all
          @node-click="onNodeClick"
        />
      </div>
      <div class="data-manage-right">
        <el-table :data="tableData" stripe border height="100%" empty-text="选择左侧节点查看数据">
          <el-table-column
            v-for="col in tableColumns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            :min-width="col.width"
          />
        </el-table>
      </div>
    </div>
    <template #footer>
      <el-button @click="onImport">导入数据</el-button>
      <el-button @click="onRefresh">刷新</el-button>
      <el-button @click="dialogStore.dataManageVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { getWellCurves, getLayers, getLithology, getInterpretation } from '@/api/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

interface TreeNode {
  label: string
  type?: string
  wellName?: string
  children?: TreeNode[]
}

interface ColumnDef {
  prop: string
  label: string
  width?: number
}

const treeData = ref<TreeNode[]>([])
const tableData = ref<Record<string, unknown>[]>([])
const tableColumns = ref<ColumnDef[]>([])

watch(
  () => dialogStore.dataManageVisible,
  async (visible) => {
    if (visible) {
      tableData.value = []
      tableColumns.value = []
      await buildTree()
    }
  }
)

async function buildTree() {
  if (!workareaStore.isOpen) {
    treeData.value = [{ label: '未打开工区' }]
    return
  }
  await wellStore.fetchWells(workareaStore.path)
  const root: TreeNode = {
    label: workareaStore.name,
    type: 'workarea',
    children: wellStore.wells.map((w) => ({
      label: w.name,
      type: 'well',
      wellName: w.name,
      children: [
        { label: '曲线', type: 'curves', wellName: w.name },
        { label: '分层', type: 'layers', wellName: w.name },
        { label: '岩性', type: 'lithology', wellName: w.name },
        { label: '解释结论', type: 'interpretation', wellName: w.name }
      ]
    }))
  }
  treeData.value = [root]
}

async function onNodeClick(node: TreeNode) {
  if (!node.type || !node.wellName) {
    tableData.value = []
    tableColumns.value = []
    return
  }

  const wellName = node.wellName
  const wa = workareaStore.path

  try {
    if (node.type === 'well') {
      tableColumns.value = [
        { prop: 'name', label: '井名', width: 120 },
        { prop: 'x', label: 'X坐标', width: 120 },
        { prop: 'y', label: 'Y坐标', width: 120 },
        { prop: 'kb', label: 'KB', width: 80 },
        { prop: 'td', label: 'TD', width: 80 }
      ]
      const well = wellStore.wells.find((w) => w.name === wellName)
      tableData.value = well ? [well] : []
    } else if (node.type === 'curves') {
      tableColumns.value = [
        { prop: 'name', label: '曲线名', width: 150 },
        { prop: 'unit', label: '单位', width: 100 },
        { prop: 'sample_interval', label: '采样间隔', width: 100 }
      ]
      const curves = await getWellCurves(wellName, wa)
      tableData.value = curves
    } else if (node.type === 'layers') {
      tableColumns.value = [
        { prop: 'formation', label: '层位', width: 150 },
        { prop: 'top_depth', label: '顶深', width: 100 },
        { prop: 'bottom_depth', label: '底深', width: 100 }
      ]
      const layers = await getLayers(wellName, wa)
      tableData.value = layers
    } else if (node.type === 'lithology') {
      tableColumns.value = [
        { prop: 'top_depth', label: '顶深', width: 80 },
        { prop: 'bottom_depth', label: '底深', width: 80 },
        { prop: 'description', label: '岩性描述', width: 250 }
      ]
      const litho = await getLithology(wellName, wa)
      tableData.value = litho
    } else if (node.type === 'interpretation') {
      tableColumns.value = [
        { prop: 'top_depth', label: '顶深', width: 80 },
        { prop: 'bottom_depth', label: '底深', width: 80 },
        { prop: 'conclusion', label: '结论', width: 150 },
        { prop: 'category', label: '类型', width: 100 }
      ]
      const interp = await getInterpretation(wellName, wa)
      tableData.value = interp
    }
  } catch {
    ElMessage.error('加载数据失败')
    tableData.value = []
  }
}

function onImport() {
  dialogStore.dataManageVisible = false
  dialogStore.showImportFile()
}

async function onRefresh() {
  await buildTree()
  tableData.value = []
  tableColumns.value = []
}
</script>

<style scoped lang="scss">
.data-manage-container {
  display: flex;
  height: 500px;
  gap: 12px;
}

.data-manage-left {
  width: 240px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: auto;
  padding: 8px;
  flex-shrink: 0;
}

.data-manage-right {
  flex: 1;
  overflow: hidden;
}
</style>
