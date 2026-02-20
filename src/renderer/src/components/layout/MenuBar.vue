<template>
  <div class="menu-bar">
    <el-menu mode="horizontal" :ellipsis="false" @select="onMenuSelect">
      <template v-for="menu in menuConfig" :key="menu.id">
        <el-sub-menu :index="menu.id">
          <template #title>{{ menu.label }}</template>
          <template v-for="item in menu.children" :key="item.id">
            <!-- Divider -->
            <div v-if="item.divider" class="menu-divider" />
            <!-- Sub-menu with children -->
            <el-sub-menu v-else-if="item.children && item.children.length" :index="item.id">
              <template #title>{{ item.label }}</template>
              <el-menu-item
                v-for="child in item.children"
                :key="child.id"
                :index="child.id"
                :disabled="child.disabled"
              >
                <span>{{ child.label }}</span>
                <span v-if="child.shortcut" class="menu-shortcut">{{ child.shortcut }}</span>
              </el-menu-item>
            </el-sub-menu>
            <!-- Regular menu item -->
            <el-menu-item v-else :index="item.id" :disabled="item.disabled">
              <span>{{ item.label }}</span>
              <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
            </el-menu-item>
          </template>
        </el-sub-menu>
      </template>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { menuConfig } from '@/config/menus'
import { useMenuAction } from '@/composables/useMenuAction'

const { handleMenuClick } = useMenuAction()

function onMenuSelect(index: string) {
  // Find the label for the selected menu item
  const label = findMenuLabel(index)
  handleMenuClick(index, label)
}

function findMenuLabel(id: string): string {
  for (const menu of menuConfig) {
    for (const item of menu.children) {
      if (item.id === id) return item.label
      if (item.children) {
        for (const child of item.children) {
          if (child.id === id) return child.label
        }
      }
    }
  }
  return id
}
</script>

<style scoped lang="scss">
.menu-bar {
  height: $menu-bar-height;
  background: $menu-bg;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
  overflow: hidden;

  .el-menu {
    height: $menu-bar-height;
    background: $menu-bg;
    border: none;
  }
}

.menu-divider {
  height: 1px;
  background: #dcdfe6;
  margin: 4px 8px;
}

.menu-shortcut {
  margin-left: 24px;
  color: #999;
  font-size: 12px;
}
</style>
