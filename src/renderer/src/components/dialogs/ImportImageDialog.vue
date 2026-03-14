<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import * as chartApi from '@/api/chart'
import { useDialogStore } from '@/stores/dialog'
import { useWorkareaStore } from '@/stores/workarea'

const IMAGE_CHART_TYPE = 'fracture_image'

const dialogStore = useDialogStore()
const workareaStore = useWorkareaStore()

const loading = ref(false)
const previewSrc = ref('')
let previewRequestId = 0

const form = reactive({
  filePath: '',
  name: '',
})

function inferFileStem(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop() || ''
  return filename.replace(/\.[^.]+$/, '')
}

function resetForm() {
  form.filePath = dialogStore.importImagePresetFilePath || ''
  form.name = dialogStore.importImagePresetName || inferFileStem(form.filePath)
}

function requireImageReader(): (filePath: string) => Promise<string> {
  if (typeof window.api?.readImageAsDataUrl !== 'function') {
    throw new Error('image-reader-unavailable')
  }
  return window.api.readImageAsDataUrl
}

async function loadImageDimensions(src: string): Promise<{ width: number, height: number }> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('image-load-failed'))
    image.src = src
  })
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
}

async function createThumbnail(src: string): Promise<string> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('thumb-load-failed'))
    image.src = src
  })

  const width = image.naturalWidth || 1
  const height = image.naturalHeight || 1
  const scale = Math.min(1, 320 / width, 240 / height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return src
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL('image/jpeg', 0.82)
  }
  catch {
    return src
  }
}

async function updatePreview(filePath: string) {
  const currentId = ++previewRequestId
  if (!filePath) {
    previewSrc.value = ''
    return
  }
  try {
    const readImageAsDataUrl = requireImageReader()
    const src = await readImageAsDataUrl(filePath)
    if (currentId === previewRequestId) {
      previewSrc.value = src
    }
  }
  catch {
    if (currentId === previewRequestId) {
      previewSrc.value = ''
    }
  }
}

watch(
  () => dialogStore.importImageVisible,
  (visible) => {
    if (visible) {
      resetForm()
      void updatePreview(form.filePath)
    }
    else {
      previewSrc.value = ''
    }
  },
)

watch(
  () => form.filePath,
  (filePath) => {
    if (!form.name.trim()) {
      form.name = inferFileStem(filePath)
    }
    void updatePreview(filePath)
  },
)

async function selectFile() {
  const result = await window.api.openFile([
    { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
  ])
  if (!result.canceled && result.filePaths.length) {
    form.filePath = result.filePaths[0]
    if (!form.name.trim()) {
      form.name = inferFileStem(form.filePath)
    }
  }
}

async function onSubmit() {
  if (!workareaStore.isOpen) {
    ElMessage.warning('请先打开或创建工区')
    return
  }
  if (!form.filePath) {
    ElMessage.warning('请选择图片文件')
    return
  }

  loading.value = true
  try {
    const readImageAsDataUrl = requireImageReader()
    const src = await readImageAsDataUrl(form.filePath)
    const { width, height } = await loadImageDimensions(src)
    const thumbnail = await createThumbnail(src)
    const name = form.name.trim() || inferFileStem(form.filePath) || '裂缝图片'

    await chartApi.saveChart(
      workareaStore.path,
      name,
      IMAGE_CHART_TYPE,
      thumbnail || src,
      JSON.stringify({
        kind: IMAGE_CHART_TYPE,
        name,
        src,
        width,
        height,
        originalFilePath: form.filePath,
      }),
    )

    dialogStore.importImageVisible = false
    ElMessage.success('图片已保存到成果集')
  }
  catch (error) {
    console.error('Failed to save image chart:', error)
    ElMessage.error('保存图片到成果集失败')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogStore.importImageVisible"
    title="导入图片到成果集"
    width="560px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form label-width="88px">
      <el-form-item label="图片名称">
        <el-input v-model="form.name" placeholder="请输入成果集名称" />
      </el-form-item>
      <el-form-item label="文件路径">
        <div class="image-path-row">
          <el-input v-model="form.filePath" readonly placeholder="选择图片文件" />
          <el-button @click="selectFile">
            选择图片
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="预览">
        <div class="image-preview-box">
          <img v-if="previewSrc" :src="previewSrc" alt="图片预览" class="image-preview" />
          <span v-else class="image-preview-empty">未选择图片</span>
        </div>
      </el-form-item>
      <div class="image-import-hint">
        原图将完整保存到成果集，列表预览使用缩略图。
      </div>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.importImageVisible = false">
        取消
      </el-button>
      <el-button type="primary" :loading="loading" @click="onSubmit">
        保存到成果集
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.image-path-row {
  width: 100%;
  display: flex;
  gap: 8px;
}

.image-preview-box {
  width: 100%;
  min-height: 220px;
  border: 1px dashed #cdd5df;
  border-radius: 8px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.image-preview-empty {
  color: #909399;
  font-size: 13px;
}

.image-import-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
</style>
