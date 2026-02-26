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
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <span>{{ node.label }}</span>
              <span v-if="data.type === 'well'" class="tree-node-actions">
                <el-icon size="14" @click.stop="onRenameWell(data)"><Edit /></el-icon>
                <el-icon size="14" @click.stop="onDeleteWell(data)"><Delete /></el-icon>
              </span>
            </span>
          </template>
        </el-tree>
      </div>
      <div class="data-manage-right">
        <div class="table-toolbar">
          <span class="toolbar-title">{{ currentNodeLabel }}</span>
          <el-button v-if="canAdd" size="small" type="primary" @click="onAdd">新增</el-button>
          <el-button size="small" @click="onRefreshTable">刷新</el-button>
        </div>
        <el-table
          :data="tableData"
          stripe
          border
          height="calc(100% - 40px)"
          empty-text="选择左侧节点查看数据"
          @cell-dblclick="onCellDblClick"
        >
          <el-table-column
            v-for="col in tableColumns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            :min-width="col.width"
          >
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row, col.prop)"
                v-model="editingValue"
                size="small"
                @keyup.enter="saveEdit(row, col.prop)"
                @keyup.escape="cancelEdit"
                @blur="saveEdit(row, col.prop)"
                :ref="(el: any) => { if (el) editInputRef = el }"
              />
              <span v-else>{{ row[col.prop] }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="currentNodeType && currentNodeType !== 'workarea'"
            label="操作"
            width="80"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="onDeleteRow(row)">删除</el-button>
            </template>
          </el-table-column>
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
import { ref, watch, nextTick, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import {
  getWellCurves,
  getLayers,
  getLithology,
  getInterpretation,
  updateWell,
  deleteWell,
  updateCurve,
  deleteCurve,
  createLayer,
  updateLayer,
  deleteLayer,
  createLithology,
  updateLithology,
  deleteLithology,
  createInterpretation,
  updateInterpretation,
  deleteInterpretation
} from '@/api/well'

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
  editable?: boolean
}

const treeData = ref<TreeNode[]>([])
const tableData = ref<Record<string, any>[]>([])
const tableColumns = ref<ColumnDef[]>([])
const currentNodeType = ref<string | null>(null)
const currentNodeLabel = ref('')
const currentWellName = ref('')

// Editing state
const editingCell = ref<{ rowId: number | string; prop: string } | null>(null)
const editingValue = ref('')
const editInputRef = ref<any>(null)

const canAdd = computed(() => {
  return ['layers', 'lithology', 'interpretation'].includes(currentNodeType.value || '')
})

// Editable columns by data type
const editableProps: Record<string, string[]> = {
  well: ['name', 'x', 'y', 'kb', 'td'],
  curves: ['name', 'unit'],
  layers: ['formation', 'top_depth', 'bottom_depth'],
  lithology: ['top_depth', 'bottom_depth', 'description'],
  interpretation: ['top_depth', 'bottom_depth', 'conclusion', 'category']
}

function isEditable(prop: string): boolean {
  const type = currentNodeType.value
  if (!type) return false
  return (editableProps[type] || []).includes(prop)
}

function isEditing(row: Record<string, any>, prop: string): boolean {
  if (!editingCell.value) return false
  const rowKey = row.id ?? row.name
  return editingCell.value.rowId === rowKey && editingCell.value.prop === prop
}

function onCellDblClick(row: Record<string, any>, column: any) {
  const prop = column.property
  if (!prop || !isEditable(prop)) return
  const rowKey = row.id ?? row.name
  editingCell.value = { rowId: rowKey, prop }
  editingValue.value = String(row[prop] ?? '')
  nextTick(() => {
    editInputRef.value?.focus?.()
  })
}

function cancelEdit() {
  editingCell.value = null
  editingValue.value = ''
}

async function saveEdit(row: Record<string, any>, prop: string) {
  if (!editingCell.value) return
  const oldVal = String(row[prop] ?? '')
  if (editingValue.value === oldVal) {
    cancelEdit()
    return
  }

  const wa = workareaStore.path
  const wellName = currentWellName.value
  const newVal = editingValue.value

  try {
    if (currentNodeType.value === 'well') {
      const updateData: Record<string, any> = {}
      if (prop === 'name') {
        updateData.name = newVal
      } else {
        updateData[prop] = newVal === '' ? null : parseFloat(newVal)
      }
      await updateWell(wellName, wa, updateData)
      if (prop === 'name') {
        currentWellName.value = newVal
        await buildTree()
      }
    } else if (currentNodeType.value === 'curves') {
      const updateData: Record<string, string> = { [prop]: newVal }
      await updateCurve(wellName, row.id, wa, updateData)
    } else if (currentNodeType.value === 'layers') {
      const updateData: Record<string, any> = {}
      if (prop === 'formation') {
        updateData.formation = newVal
      } else {
        updateData[prop] = parseFloat(newVal)
      }
      await updateLayer(wellName, row.id, wa, updateData)
    } else if (currentNodeType.value === 'lithology') {
      const updateData: Record<string, any> = {}
      if (prop === 'description') {
        updateData.description = newVal
      } else {
        updateData[prop] = parseFloat(newVal)
      }
      await updateLithology(wellName, row.id, wa, updateData)
    } else if (currentNodeType.value === 'interpretation') {
      const updateData: Record<string, any> = {}
      if (['conclusion', 'category'].includes(prop)) {
        updateData[prop] = newVal
      } else {
        updateData[prop] = parseFloat(newVal)
      }
      await updateInterpretation(wellName, row.id, wa, updateData)
    }

    row[prop] = prop === 'name' || prop === 'formation' || prop === 'description' || prop === 'conclusion' || prop === 'category' || prop === 'unit'
      ? newVal
      : (newVal === '' ? null : parseFloat(newVal))
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
  cancelEdit()
}

watch(
  () => dialogStore.dataManageVisible,
  async (visible) => {
    if (visible) {
      tableData.value = []
      tableColumns.value = []
      currentNodeType.value = null
      currentNodeLabel.value = ''
      currentWellName.value = ''
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
  cancelEdit()
  currentNodeType.value = node.type || null
  currentNodeLabel.value = node.label
  currentWellName.value = node.wellName || ''

  if (!node.type || !node.wellName) {
    if (node.type === 'workarea') {
      currentNodeLabel.value = workareaStore.name
    }
    tableData.value = []
    tableColumns.value = []
    return
  }

  await loadTableData(node.type, node.wellName)
}

async function loadTableData(type: string, wellName: string) {
  const wa = workareaStore.path
  try {
    if (type === 'well') {
      tableColumns.value = [
        { prop: 'name', label: '井名', width: 120, editable: true },
        { prop: 'x', label: 'X坐标', width: 120, editable: true },
        { prop: 'y', label: 'Y坐标', width: 120, editable: true },
        { prop: 'kb', label: 'KB', width: 80, editable: true },
        { prop: 'td', label: 'TD', width: 80, editable: true }
      ]
      const well = wellStore.wells.find((w) => w.name === wellName)
      tableData.value = well ? [{ ...well }] : []
    } else if (type === 'curves') {
      tableColumns.value = [
        { prop: 'name', label: '曲线名', width: 150, editable: true },
        { prop: 'unit', label: '单位', width: 100, editable: true },
        { prop: 'sample_interval', label: '采样间隔', width: 100 }
      ]
      const curves = await getWellCurves(wellName, wa)
      tableData.value = curves
    } else if (type === 'layers') {
      tableColumns.value = [
        { prop: 'formation', label: '层位', width: 150, editable: true },
        { prop: 'top_depth', label: '顶深', width: 100, editable: true },
        { prop: 'bottom_depth', label: '底深', width: 100, editable: true }
      ]
      const layers = await getLayers(wellName, wa)
      tableData.value = layers
    } else if (type === 'lithology') {
      tableColumns.value = [
        { prop: 'top_depth', label: '顶深', width: 80, editable: true },
        { prop: 'bottom_depth', label: '底深', width: 80, editable: true },
        { prop: 'description', label: '岩性描述', width: 250, editable: true }
      ]
      const litho = await getLithology(wellName, wa)
      tableData.value = litho
    } else if (type === 'interpretation') {
      tableColumns.value = [
        { prop: 'top_depth', label: '顶深', width: 80, editable: true },
        { prop: 'bottom_depth', label: '底深', width: 80, editable: true },
        { prop: 'conclusion', label: '结论', width: 150, editable: true },
        { prop: 'category', label: '类型', width: 100, editable: true }
      ]
      const interp = await getInterpretation(wellName, wa)
      tableData.value = interp
    }
  } catch {
    ElMessage.error('加载数据失败')
    tableData.value = []
  }
}

// ── Tree node actions ──────────────────────────────────────────────

async function onRenameWell(data: TreeNode) {
  if (!data.wellName) return
  try {
    const result = await ElMessageBox.prompt('请输入新井名', '重命名井', {
      inputValue: data.wellName,
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValidator: (val) => (val && val.trim() ? true : '井名不能为空')
    })
    const newName = ((result as any).value as string || '').trim()
    if (newName === data.wellName) return
    await updateWell(data.wellName, workareaStore.path, { name: newName })
    ElMessage.success('重命名成功')
    await buildTree()
    // If this well was selected, reload
    if (currentWellName.value === data.wellName) {
      currentWellName.value = newName
      if (currentNodeType.value) {
        await loadTableData(currentNodeType.value, newName)
      }
    }
  } catch {
    // user cancelled or API error
  }
}

async function onDeleteWell(data: TreeNode) {
  if (!data.wellName) return
  try {
    await ElMessageBox.confirm(
      `确定删除井 "${data.wellName}" 吗？将同时删除该井的所有曲线、分层、岩性和解释数据。`,
      '删除井',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteWell(data.wellName, workareaStore.path)
    ElMessage.success('删除成功')
    if (currentWellName.value === data.wellName) {
      tableData.value = []
      tableColumns.value = []
      currentNodeType.value = null
      currentNodeLabel.value = ''
      currentWellName.value = ''
    }
    await buildTree()
  } catch {
    // user cancelled or API error
  }
}

// ── Table row actions ──────────────────────────────────────────────

async function onDeleteRow(row: Record<string, any>) {
  const wa = workareaStore.path
  const wellName = currentWellName.value
  const type = currentNodeType.value

  let msg = '确定删除此条数据吗？'
  if (type === 'well') {
    msg = `确定删除井 "${row.name}" 及其所有子数据吗？`
  } else if (type === 'curves') {
    msg = `确定删除曲线 "${row.name}" 及其所有数据吗？`
  }

  try {
    await ElMessageBox.confirm(msg, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    if (type === 'well') {
      await deleteWell(row.name, wa)
      await buildTree()
      tableData.value = []
      tableColumns.value = []
      currentNodeType.value = null
      currentNodeLabel.value = ''
      currentWellName.value = ''
    } else if (type === 'curves') {
      await deleteCurve(wellName, row.id, wa)
      tableData.value = tableData.value.filter((r) => r.id !== row.id)
    } else if (type === 'layers') {
      await deleteLayer(wellName, row.id, wa)
      tableData.value = tableData.value.filter((r) => r.id !== row.id)
    } else if (type === 'lithology') {
      await deleteLithology(wellName, row.id, wa)
      tableData.value = tableData.value.filter((r) => r.id !== row.id)
    } else if (type === 'interpretation') {
      await deleteInterpretation(wellName, row.id, wa)
      tableData.value = tableData.value.filter((r) => r.id !== row.id)
    }
    ElMessage.success('删除成功')
  } catch {
    // user cancelled or API error
  }
}

async function onAdd() {
  const wa = workareaStore.path
  const wellName = currentWellName.value
  const type = currentNodeType.value

  try {
    if (type === 'layers') {
      const res = await createLayer(wellName, wa, {
        formation: '新层位',
        top_depth: 0,
        bottom_depth: 0
      })
      tableData.value.push({
        id: res.id,
        formation: '新层位',
        top_depth: 0,
        bottom_depth: 0
      })
    } else if (type === 'lithology') {
      const res = await createLithology(wellName, wa, {
        top_depth: 0,
        bottom_depth: 0,
        description: '新岩性'
      })
      tableData.value.push({
        id: res.id,
        top_depth: 0,
        bottom_depth: 0,
        description: '新岩性'
      })
    } else if (type === 'interpretation') {
      const res = await createInterpretation(wellName, wa, {
        top_depth: 0,
        bottom_depth: 0,
        conclusion: '新结论',
        category: ''
      })
      tableData.value.push({
        id: res.id,
        top_depth: 0,
        bottom_depth: 0,
        conclusion: '新结论',
        category: ''
      })
    }
    ElMessage.success('新增成功')
  } catch {
    ElMessage.error('新增失败')
  }
}

async function onRefreshTable() {
  if (currentNodeType.value && currentWellName.value) {
    cancelEdit()
    await loadTableData(currentNodeType.value, currentWellName.value)
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
  currentNodeType.value = null
  currentNodeLabel.value = ''
  currentWellName.value = ''
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
  display: flex;
  flex-direction: column;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;

  .toolbar-title {
    flex: 1;
    font-weight: 500;
    font-size: 14px;
    color: #303133;
  }
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;
}

.tree-node-actions {
  display: none;
  gap: 4px;
  margin-left: 8px;

  .el-icon {
    cursor: pointer;
    color: #909399;

    &:hover {
      color: #409eff;
    }
  }
}

.tree-node:hover .tree-node-actions {
  display: inline-flex;
}
</style>
