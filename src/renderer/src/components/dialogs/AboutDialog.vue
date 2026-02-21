<template>
  <el-dialog
    v-model="dialogStore.aboutVisible"
    title="关于 PetroSoft"
    width="420px"
    :close-on-click-modal="true"
  >
    <div class="about-content">
      <div class="about-logo">PetroSoft</div>
      <div class="about-version">V1.0.0</div>
      <div class="about-desc">SMI 储层定量表征平台</div>
      <div class="about-divider" />
      <div class="about-info">
        <p>基于 Electron + Vue 3 + FastAPI 构建</p>
        <p>支持井数据管理、曲线分析、数据可视化</p>
      </div>
      <div class="about-copyright">&copy; 2024 PetroSoft Team. All rights reserved.</div>
    </div>
    <template #footer>
      <el-button type="primary" @click="dialogStore.aboutVisible = false">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useDialogStore } from '@/stores/dialog'

const dialogStore = useDialogStore()
</script>

<style scoped>
.about-content {
  text-align: center;
  padding: 12px 0;
}
.about-logo {
  font-size: 28px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 4px;
}
.about-version {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.about-desc {
  font-size: 15px;
  color: #303133;
  margin-bottom: 16px;
}
.about-divider {
  height: 1px;
  background: #dcdfe6;
  margin: 12px 0;
}
.about-info {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  margin-bottom: 16px;
}
.about-info p {
  margin: 0;
}
.about-copyright {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
