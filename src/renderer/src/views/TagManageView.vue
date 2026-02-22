<template>
  <div class="tag-manage">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" size="small" @click="openCreateDialog">新建标签</el-button>
        <el-button size="small" @click="fetchTags">刷新</el-button>
      </div>
      <div class="toolbar-right">
        <el-input v-model="searchText" placeholder="搜索标签" size="small" clearable style="width: 200px" />
      </div>
    </div>

    <el-table :data="filteredTags" border stripe style="width: 100%" v-loading="loading">
      <el-table-column label="标签名" prop="name" min-width="150">
        <template #default="{ row }">
          <el-tag :color="row.color" style="color: #fff; border: none">{{ row.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="颜色" width="80" align="center">
        <template #default="{ row }">
          <span class="color-dot" :style="{ background: row.color }"></span>
        </template>
      </el-table-column>
      <el-table-column label="关联井数" prop="well_count" width="100" align="center" />
      <el-table-column label="创建时间" prop="created_at" width="170" />
      <el-table-column label="操作" width="240" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button size="small" @click="openWellDialog(row)">管理井</el-button>
          <el-popconfirm title="确定删除此标签？" @confirm="onDeleteTag(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- Create/Edit tag dialog -->
    <el-dialog v-model="tagDialogVisible" :title="editingTag ? '编辑标签' : '新建标签'" width="400px">
      <el-form :model="tagForm" label-width="80px">
        <el-form-item label="标签名称">
          <el-input v-model="tagForm.name" placeholder="输入标签名" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="tagForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSaveTag">保存</el-button>
      </template>
    </el-dialog>

    <!-- Manage wells dialog -->
    <el-dialog v-model="wellDialogVisible" title="管理关联井" width="700px">
      <el-transfer
        v-model="selectedWellNames"
        :data="transferData"
        :titles="['全部井', '已选井']"
        filterable
        filter-placeholder="搜索井名"
      />
      <template #footer>
        <el-button @click="wellDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assigning" @click="onSaveWells">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkareaStore } from '@/stores/workarea'
import { useWellStore } from '@/stores/well'
import { listTags, createTag, updateTag, deleteTag, assignTags, getWellTags } from '@/api/tag'
import type { TagInfo } from '@/api/tag'

const workareaStore = useWorkareaStore()
const wellStore = useWellStore()

const loading = ref(false)
const tags = ref<TagInfo[]>([])
const searchText = ref('')

const tagDialogVisible = ref(false)
const editingTag = ref<TagInfo | null>(null)
const tagForm = ref({ name: '', color: '#409eff' })
const saving = ref(false)

const wellDialogVisible = ref(false)
const currentTagForWells = ref<TagInfo | null>(null)
const selectedWellNames = ref<string[]>([])
const assigning = ref(false)

interface TransferItem {
  key: string
  label: string
}

const transferData = computed<TransferItem[]>(() =>
  wellStore.wells.map((w) => ({ key: w.name, label: w.name }))
)

const filteredTags = computed(() => {
  if (!searchText.value) return tags.value
  const s = searchText.value.toLowerCase()
  return tags.value.filter((t) => t.name.toLowerCase().includes(s))
})

watch(
  () => workareaStore.path,
  () => {
    if (workareaStore.isOpen) fetchTags()
  },
  { immediate: true }
)

async function fetchTags() {
  if (!workareaStore.isOpen) return
  loading.value = true
  try {
    tags.value = await listTags(workareaStore.path)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingTag.value = null
  tagForm.value = { name: '', color: '#409eff' }
  tagDialogVisible.value = true
}

function openEditDialog(tag: TagInfo) {
  editingTag.value = tag
  tagForm.value = { name: tag.name, color: tag.color }
  tagDialogVisible.value = true
}

async function onSaveTag() {
  if (!tagForm.value.name.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  saving.value = true
  try {
    if (editingTag.value) {
      await updateTag(workareaStore.path, editingTag.value.id, tagForm.value.name, tagForm.value.color)
      ElMessage.success('标签已更新')
    } else {
      await createTag(workareaStore.path, tagForm.value.name, tagForm.value.color)
      ElMessage.success('标签已创建')
    }
    tagDialogVisible.value = false
    await fetchTags()
  } catch (e: unknown) {
    const axiosErr = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(axiosErr.response?.data?.detail || '操作失败')
  } finally {
    saving.value = false
  }
}

async function onDeleteTag(tagId: number) {
  try {
    await deleteTag(workareaStore.path, tagId)
    ElMessage.success('标签已删除')
    await fetchTags()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function openWellDialog(tag: TagInfo) {
  currentTagForWells.value = tag
  await wellStore.fetchWells(workareaStore.path)
  // Get currently assigned wells for this tag
  try {
    const allWells = wellStore.wells
    const assignedNames: string[] = []
    for (const w of allWells) {
      const wTags = await getWellTags(workareaStore.path, w.name)
      if (wTags.some((t) => t.id === tag.id)) {
        assignedNames.push(w.name)
      }
    }
    selectedWellNames.value = assignedNames
  } catch {
    selectedWellNames.value = []
  }
  wellDialogVisible.value = true
}

async function onSaveWells() {
  if (!currentTagForWells.value) return
  assigning.value = true
  try {
    const tag = currentTagForWells.value
    // For each well, assign or unassign the tag
    for (const w of wellStore.wells) {
      const wTags = await getWellTags(workareaStore.path, w.name)
      const currentTagIds = wTags.map((t) => t.id)
      const shouldHaveTag = selectedWellNames.value.includes(w.name)
      const hasTag = currentTagIds.includes(tag.id)

      if (shouldHaveTag && !hasTag) {
        await assignTags(workareaStore.path, w.name, [...currentTagIds, tag.id])
      } else if (!shouldHaveTag && hasTag) {
        await assignTags(workareaStore.path, w.name, currentTagIds.filter((id) => id !== tag.id))
      }
    }
    ElMessage.success('井关联已更新')
    wellDialogVisible.value = false
    await fetchTags()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    assigning.value = false
  }
}
</script>

<style scoped>
.tag-manage {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toolbar-left {
  display: flex;
  gap: 8px;
}
.color-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
</style>
