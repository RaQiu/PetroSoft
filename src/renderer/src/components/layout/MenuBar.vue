<template>
  <div class="menu-bar">
    <el-menu mode="horizontal" :ellipsis="false" @select="onMenuSelect">
      <template v-for="menu in menuConfig" :key="menu.id">
        <el-sub-menu :index="menu.id">
          <template #title>{{ menu.label }}</template>
          <template v-for="item in menu.children" :key="item.id">
            <!-- Divider -->
            <div v-if="item.divider" class="menu-divider" />
            <!-- Recent workareas (dynamic) -->
            <el-sub-menu v-else-if="item.id === 'file.recent'" :index="item.id">
              <template #title>{{ item.label }}</template>
              <template v-if="recentItems.length">
                <el-menu-item
                  v-for="r in recentItems"
                  :key="r.id"
                  :index="r.id"
                >
                  <span>{{ r.label }}</span>
                </el-menu-item>
              </template>
              <el-menu-item v-else index="file.recent.empty" disabled>
                <span>(无)</span>
              </el-menu-item>
            </el-sub-menu>
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
import { computed, onMounted } from 'vue'
import { menuConfig } from '@/config/menus'
import { useMenuAction } from '@/composables/useMenuAction'
import { useWorkareaStore } from '@/stores/workarea'

const { handleMenuClick } = useMenuAction()
const workareaStore = useWorkareaStore()

const recentItems = computed(() => {
  return workareaStore.recentWorkareas.map((w) => ({
    id: `file.recent.${w.path}`,
    label: `${w.name} - ${w.path}`
  }))
})

onMounted(() => {
  workareaStore.fetchRecentWorkareas()
})

function onMenuSelect(index: string) {
  const label = findMenuLabel(index)
  handleMenuClick(index, label)
}

function findMenuLabel(id: string): string {
  // Check dynamic recent items first
  for (const r of recentItems.value) {
    if (r.id === id) return r.label
  }
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
