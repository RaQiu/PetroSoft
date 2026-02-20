<template>
  <div class="main-content">
    <el-tabs v-model="uiStore.activeTab" type="border-card" class="content-tabs">
      <el-tab-pane label="数据导入" name="data-import">
        <DataImportView />
      </el-tab-pane>
      <el-tab-pane label="标签管理" name="tag-manage">
        <TagManageView />
      </el-tab-pane>
      <el-tab-pane label="任务管理" name="task-manage">
        <TaskManageView />
      </el-tab-pane>
      <el-tab-pane label="成果图管理" name="result-map">
        <ResultMapView />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import DataImportView from '@/views/DataImportView.vue'
import TagManageView from '@/views/TagManageView.vue'
import TaskManageView from '@/views/TaskManageView.vue'
import ResultMapView from '@/views/ResultMapView.vue'

const uiStore = useUiStore()
</script>

<style scoped lang="scss">
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  box-shadow: none;

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}
</style>
