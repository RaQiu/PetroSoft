<template>
  <el-dialog
    v-model="dialogStore.wellListVisible"
    title="井管理"
    width="700px"
    :close-on-click-modal="false"
  >
    <el-table
      :data="wellStore.wells"
      stripe
      border
      highlight-current-row
      empty-text="暂无井数据"
      @row-dblclick="onRowDblClick"
    >
      <el-table-column prop="name" label="井名" min-width="120" />
      <el-table-column prop="x" label="X坐标" width="120" />
      <el-table-column prop="y" label="Y坐标" width="120" />
      <el-table-column prop="kb" label="KB" width="80" />
      <el-table-column prop="td" label="TD" width="80" />
    </el-table>
    <template #footer>
      <el-button @click="dialogStore.wellListVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import type { WellInfo } from '@/types/well'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

watch(
  () => dialogStore.wellListVisible,
  async (visible) => {
    if (visible && workareaStore.isOpen) {
      await wellStore.fetchWells(workareaStore.path)
    }
  }
)

function onRowDblClick(row: WellInfo) {
  wellStore.selectWell(row)
  ElMessage.success(`已选中井: ${row.name}`)
  dialogStore.wellListVisible = false
}
</script>
