<template>
  <div class="status-bar">
    <span class="status-item">工区: {{ workareaStore.displayName() }}</span>
    <span class="status-spacer" />
    <span class="status-item status-right">就绪</span>
  </div>
</template>

<script setup lang="ts">
import { useWorkareaStore } from '@/stores/workarea'

const workareaStore = useWorkareaStore()
</script>

<style scoped lang="scss">
.status-bar {
  height: $status-bar-height;
  background: $status-bg;
  border-top: 1px solid $border-color;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: $status-text;
  flex-shrink: 0;
}

.status-item {
  white-space: nowrap;
}

.status-spacer {
  flex: 1;
}

.status-right {
  color: #888;
}
</style>
