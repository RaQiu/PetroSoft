<template>
  <div class="toolbar">
    <ToolBarButton
      v-for="item in toolbarConfig"
      :key="item.id"
      :label="item.label"
      :icon="item.icon"
      :tooltip="item.tooltip"
      :disabled="item.disabled"
      @click="onToolClick(item)"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { toolbarConfig } from '@/config/toolbar'
import ToolBarButton from '@/components/common/ToolBarButton.vue'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import type { ToolBarItem } from '@/types/toolbar'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()

function onToolClick(item: ToolBarItem) {
  switch (item.id) {
    case 'tb-data-manage':
      if (!workareaStore.isOpen) {
        ElMessage.warning('请先打开或创建工区')
        return
      }
      dialogStore.showDataManage()
      break
    case 'tb-well-curve':
      if (!workareaStore.isOpen) {
        ElMessage.warning('请先打开或创建工区')
        return
      }
      dialogStore.showWellCurve()
      break
    default:
      ElMessage.info(`「${item.label}」功能开发中...`)
  }
}
</script>

<style scoped lang="scss">
.toolbar {
  height: $toolbar-height;
  background: $toolbar-bg;
  border-bottom: 1px solid $toolbar-border;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  flex-shrink: 0;
  overflow-x: auto;
}
</style>
