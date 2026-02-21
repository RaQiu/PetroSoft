<template>
  <div class="welcome-view">
    <div class="welcome-card">
      <div class="welcome-logo">
        <svg viewBox="0 0 64 64" width="72" height="72">
          <circle cx="32" cy="32" r="30" fill="none" stroke="#2e86c1" stroke-width="2.5" />
          <path d="M22 18 L22 46 M22 18 L36 18 Q42 18 42 24 Q42 30 36 30 L22 30"
            fill="none" stroke="#1a5276" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M34 38 L42 46" stroke="#2e86c1" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
      <h1 class="welcome-title">PetroSoft V1.0</h1>
      <p class="welcome-desc">石油地质数据管理与分析平台</p>
      <div class="welcome-actions">
        <button class="welcome-btn primary" @click="$emit('create')">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          <span>创建工区</span>
        </button>
        <button class="welcome-btn secondary" @click="$emit('open')">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span>打开工区</span>
        </button>
      </div>
      <div class="welcome-recent" v-if="recentWorkareas.length > 0">
        <div class="recent-title">最近打开</div>
        <div
          v-for="w in recentWorkareas"
          :key="w.path"
          class="recent-item"
          @click="openRecent(w.path)"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="#909399">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span class="recent-name">{{ w.name }}</span>
          <span class="recent-path">{{ w.path }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkareaStore } from '@/stores/workarea'
import { storeToRefs } from 'pinia'

defineEmits<{
  create: []
  open: []
}>()

const workareaStore = useWorkareaStore()
const { recentWorkareas } = storeToRefs(workareaStore)

onMounted(() => {
  workareaStore.fetchRecentWorkareas()
})

function openRecent(path: string) {
  workareaStore.openWorkareaFromPath(path)
}
</script>

<style scoped lang="scss">
.welcome-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #f0f5fa 0%, #e8eef5 50%, #dce5f0 100%);
}

.welcome-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 56px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  min-width: 420px;
  max-width: 500px;
}

.welcome-logo {
  margin-bottom: 16px;
  opacity: 0.9;
}

.welcome-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a5276;
  margin: 0 0 8px;
  letter-spacing: 1px;
}

.welcome-desc {
  font-size: 14px;
  color: #909399;
  margin: 0 0 32px;
}

.welcome-actions {
  display: flex;
  gap: 16px;
  width: 100%;
}

.welcome-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.primary {
    background: #2e86c1;
    color: #fff;
    &:hover { background: #2471a3; }
    &:active { background: #1a5276; }
  }

  &.secondary {
    background: #f0f5fa;
    color: #2e86c1;
    border: 1px solid #d4e4f1;
    &:hover { background: #e2ecf5; }
    &:active { background: #d4e4f1; }
  }
}

.welcome-recent {
  width: 100%;
  margin-top: 28px;
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

.recent-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  font-weight: 600;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f0f5fa;
  }
}

.recent-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}

.recent-path {
  font-size: 11px;
  color: #b0b6bf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
