<template>
  <div class="data-import-view">
    <div class="view-header">
      <el-select v-model="windowType" placeholder="窗体类型" style="width: 160px" size="small">
        <el-option label="全部" value="all" />
        <el-option label="地震数据" value="seismic" />
        <el-option label="井数据" value="well" />
        <el-option label="层位数据" value="horizon" />
      </el-select>
      <el-button type="primary" size="small" :icon="Plus">导入数据</el-button>
    </div>
    <el-table :data="tableData" stripe border style="width: 100%" empty-text="暂无数据，请导入">
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column prop="type" label="窗体类型" width="150" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const windowType = ref('all')
const tableData = ref<{ name: string; type: string; createdAt: string }[]>([])
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
