<template>
  <div class="placeholder-view">
    <el-empty :description="description" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  description?: string
}>()
</script>

<style scoped lang="scss">
.placeholder-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}
</style>
