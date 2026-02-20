<template>
  <div class="title-bar">
    <span class="title-text">PetroSoft V1.0</span>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.title-bar {
  height: $title-bar-height;
  background: linear-gradient(135deg, $title-gradient-start, $title-gradient-end);
  display: flex;
  align-items: center;
  padding: 0 16px;
  user-select: none;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.title-text {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
}
</style>
