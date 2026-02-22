<template>
  <el-dialog
    v-model="dialogStore.horizonFromTopsVisible"
    title="井分层创建层位"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="110px">
      <el-form-item label="分层名称">
        <el-select v-model="form.formation" placeholder="选择分层" style="width: 100%" filterable>
          <el-option v-for="f in formations" :key="f" :label="f" :value="f" />
        </el-select>
      </el-form-item>
      <el-form-item label="域">
        <el-select v-model="form.domain" style="width: 100%">
          <el-option label="深度域" value="depth" />
          <el-option label="时间域" value="time" />
        </el-select>
      </el-form-item>
      <el-form-item label="层位名称">
        <el-input v-model="form.horizonName" placeholder="输出层位名" />
      </el-form-item>
    </el-form>
    <div class="method-help">从所有包含该分层的井中提取顶深，创建散点层位</div>
    <template #footer>
      <el-button @click="dialogStore.horizonFromTopsVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="onSubmit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'
import { listFormations, createHorizonFromWellTops } from '@/api/horizon'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()
const loading = ref(false)
const formations = ref<string[]>([])

const form = reactive({
  formation: '',
  domain: 'depth',
  horizonName: ''
})

const canSubmit = computed(() => form.formation && form.horizonName)

watch(() => dialogStore.horizonFromTopsVisible, async (visible) => {
  if (visible && workareaStore.isOpen) {
    form.formation = ''
    form.domain = 'depth'
    form.horizonName = ''
    formations.value = await listFormations(workareaStore.path)
  }
})

watch(() => form.formation, (v) => {
  if (v && !form.horizonName) {
    form.horizonName = v
  }
})

async function onSubmit() {
  loading.value = true
  try {
    const res = await createHorizonFromWellTops({
      workarea_path: workareaStore.path,
      formation: form.formation,
      horizon_name: form.horizonName,
      domain: form.domain
    })
    ElMessage.success(res.message)
    dialogStore.horizonFromTopsVisible = false
  } catch (e: unknown) {
    const errMsg = (e && typeof e === 'object' && 'response' in e) ? ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '创建层位失败') : '创建层位失败'
    ElMessage.error(errMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.method-help {
  font-size: 12px; color: #909399; padding: 0 0 4px 110px;
}
</style>
