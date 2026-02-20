<template>
  <el-dialog
    v-model="dialogStore.createWorkareaVisible"
    title="新建工区"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="80px" @submit.prevent="onSubmit">
      <el-form-item label="工区名称">
        <el-input v-model="form.name" placeholder="请输入工区名称" />
      </el-form-item>
      <el-form-item label="存储路径">
        <div style="display: flex; gap: 8px; width: 100%">
          <el-input v-model="form.path" placeholder="选择存储目录" readonly />
          <el-button @click="selectDirectory">选择目录</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.createWorkareaVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!form.name || !form.path" @click="onSubmit">
        创建
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()

const form = reactive({
  name: '',
  path: ''
})

async function selectDirectory() {
  const result = await window.api.openDirectory()
  if (!result.canceled && result.filePaths.length) {
    form.path = result.filePaths[0]
  }
}

async function onSubmit() {
  if (!form.name || !form.path) return
  try {
    await workareaStore.createWorkareaAndOpen(form.name, form.path)
    dialogStore.createWorkareaVisible = false
    form.name = ''
    form.path = ''
  } catch {
    // error already shown by store
  }
}
</script>
