<template>
  <el-tooltip :content="tooltip" placement="bottom" :show-after="500">
    <el-button
      class="toolbar-btn"
      :disabled="disabled"
      @click="$emit('click')"
    >
      <el-icon :size="18">
        <component :is="icon" />
      </el-icon>
      <span class="toolbar-btn-label">{{ label }}</span>
    </el-button>
  </el-tooltip>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  tooltip: string
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped lang="scss">
.toolbar-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 2px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  gap: 1px;

  &:hover {
    background: $menu-hover;
  }

  .toolbar-btn-label {
    font-size: 11px;
    color: $text-secondary;
    line-height: 1;
  }
}
</style>
