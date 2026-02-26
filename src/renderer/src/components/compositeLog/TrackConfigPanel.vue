<template>
  <div class="track-config-panel">
    <!-- Well selector -->
    <div class="panel-section">
      <div class="section-title">选择井</div>
      <el-select
        :model-value="selectedWell"
        placeholder="选择井"
        size="small"
        style="width: 100%"
        filterable
        @change="$emit('update:selectedWell', $event)"
      >
        <el-option v-for="w in wells" :key="w.name" :label="w.name" :value="w.name" />
      </el-select>
    </div>

    <!-- Depth range -->
    <div class="panel-section">
      <div class="section-title">深度范围 (m)</div>
      <div class="depth-inputs">
        <el-input-number
          :model-value="config.depthRange.min"
          size="small"
          :step="10"
          :min="0"
          controls-position="right"
          @change="onDepthMinChange"
        />
        <span class="depth-sep">–</span>
        <el-input-number
          :model-value="config.depthRange.max"
          size="small"
          :step="10"
          :min="config.depthRange.min + 10"
          controls-position="right"
          @change="onDepthMaxChange"
        />
      </div>
    </div>

    <!-- Grid config -->
    <div class="panel-section">
      <div class="section-title">
        网格
        <el-switch
          :model-value="gridConfig.enabled"
          size="small"
          @change="onGridFieldChange('enabled', $event)"
        />
      </div>
      <template v-if="gridConfig.enabled">
        <div class="grid-row">
          <span class="grid-label">主线</span>
          <el-input-number
            :model-value="gridConfig.majorInterval"
            size="small"
            :min="2"
            :max="20"
            :step="1"
            controls-position="right"
            style="width: 64px"
            @change="onGridFieldChange('majorInterval', $event)"
          />
          <el-color-picker
            :model-value="gridConfig.majorColor"
            size="small"
            @change="onGridFieldChange('majorColor', $event)"
          />
          <el-select
            :model-value="gridConfig.majorWidth"
            size="small"
            style="width: 64px"
            @change="onGridFieldChange('majorWidth', $event)"
          >
            <el-option v-for="lw in GRID_WIDTHS" :key="lw" :value="lw" :label="lw + 'px'">
              <span class="style-option">
                <svg width="30" height="12"><line x1="0" y1="6" x2="30" y2="6"
                  :stroke="gridConfig.majorColor" :stroke-width="lw" /></svg>
                <span>{{ lw }}px</span>
              </span>
            </el-option>
          </el-select>
        </div>
        <div class="grid-row">
          <span class="grid-label">次线</span>
          <el-input-number
            :model-value="gridConfig.minorInterval"
            size="small"
            :min="0"
            :max="10"
            :step="1"
            controls-position="right"
            style="width: 64px"
            @change="onGridFieldChange('minorInterval', $event)"
          />
          <el-color-picker
            :model-value="gridConfig.minorColor"
            size="small"
            @change="onGridFieldChange('minorColor', $event)"
          />
          <el-select
            :model-value="gridConfig.minorWidth"
            size="small"
            style="width: 64px"
            @change="onGridFieldChange('minorWidth', $event)"
          >
            <el-option v-for="lw in GRID_WIDTHS" :key="lw" :value="lw" :label="lw + 'px'">
              <span class="style-option">
                <svg width="30" height="12"><line x1="0" y1="6" x2="30" y2="6"
                  :stroke="gridConfig.minorColor" :stroke-width="lw" /></svg>
                <span>{{ lw }}px</span>
              </span>
            </el-option>
          </el-select>
        </div>
      </template>
    </div>

    <!-- Track list -->
    <div class="panel-section">
      <div class="section-title">
        道列表 ({{ config.tracks.length }})
        <el-dropdown trigger="click" size="small" @command="onAddTrack">
          <el-button size="small" :icon="Plus" circle />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="formation">地层</el-dropdown-item>
              <el-dropdown-item command="depth">深度</el-dropdown-item>
              <el-dropdown-item command="lithology">岩性</el-dropdown-item>
              <el-dropdown-item command="curve">曲线</el-dropdown-item>
              <el-dropdown-item command="discrete">离散</el-dropdown-item>
              <el-dropdown-item command="interpretation">解释结论</el-dropdown-item>
              <el-dropdown-item command="mineral">矿物百分比</el-dropdown-item>
              <el-dropdown-item command="text">文本</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div v-if="!config.tracks.length" class="empty-hint">请添加道或使用推荐布局</div>

      <div
        v-for="(track, idx) in config.tracks"
        :key="track.id"
        class="track-item"
        :class="{ 'drag-over': dragOverIdx === idx }"
        draggable="true"
        @dragstart="onDragStart(idx, $event)"
        @dragover.prevent="onDragOver(idx)"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop(idx)"
        @dragend="onDragEnd"
      >
        <div class="track-header" @click="toggleExpand(track.id)">
          <span class="drag-handle" @mousedown.stop>&#x2630;</span>
          <el-checkbox
            :model-value="track.visible"
            size="small"
            @change="onToggleVisible(idx, $event as boolean)"
            @click.stop
          />
          <span class="track-label">{{ track.title }}</span>
          <span class="track-type-tag">{{ trackTypeLabel(track.type) }}</span>
          <el-button
            size="small"
            :icon="Delete"
            circle
            class="track-delete-btn"
            @click.stop="onRemoveTrack(idx)"
          />
        </div>

        <!-- Expanded config -->
        <div v-if="expandedTrackId === track.id" class="track-detail">
          <!-- Title -->
          <el-input
            :model-value="track.title"
            size="small"
            placeholder="道标题"
            @change="onTrackFieldChange(idx, 'title', $event)"
          />

          <!-- Width -->
          <div class="field-row">
            <span>宽度</span>
            <el-input-number
              :model-value="track.width"
              size="small"
              :min="30"
              :max="400"
              :step="10"
              controls-position="right"
              @change="onTrackFieldChange(idx, 'width', $event)"
            />
          </div>

          <!-- Background color (all track types) -->
          <div class="field-row">
            <span>背景色</span>
            <el-color-picker
              :model-value="track.bgColor || '#ffffff'"
              size="small"
              show-alpha
              @change="onTrackFieldChange(idx, 'bgColor', $event)"
            />
          </div>

          <!-- Curve config (for curve/discrete tracks) -->
          <template v-if="track.type === 'curve' || track.type === 'discrete'">
            <div class="curve-list-header">
              <span>曲线 ({{ (track.curves || []).length }})</span>
              <el-button size="small" @click="onAddCurveToTrack(idx)">+ 曲线</el-button>
            </div>
            <div
              v-for="(cs, ci) in track.curves || []"
              :key="ci"
              class="curve-config-item"
            >
              <!-- Curve name selector -->
              <div class="curve-name-row">
                <el-select
                  :model-value="cs.curveName"
                  size="small"
                  filterable
                  placeholder="选择曲线"
                  style="flex:1"
                  @change="onCurveNameChange(idx, ci, $event as string)"
                >
                  <el-option
                    v-for="c in availableCurves"
                    :key="c.name"
                    :label="`${c.name} (${c.unit})`"
                    :value="c.name"
                  />
                </el-select>
                <el-button
                  size="small"
                  :icon="Delete"
                  circle
                  @click="onRemoveCurve(idx, ci)"
                />
              </div>

              <!-- Live preview bar -->
              <div class="curve-preview">
                <svg width="100%" height="16" preserveAspectRatio="none">
                  <line x1="0" y1="8" x2="100%" y2="8"
                    :stroke="cs.color" :stroke-width="cs.lineWidth"
                    :stroke-dasharray="lineDash(cs.lineStyle)" />
                </svg>
              </div>

              <!-- Style group -->
              <div class="group-title">样式</div>
              <div class="curve-style-row">
                <el-color-picker
                  :model-value="cs.color"
                  size="small"
                  @change="onCurveStyleChange(idx, ci, 'color', $event)"
                />
                <!-- Line style with SVG preview -->
                <el-select
                  :model-value="cs.lineStyle"
                  size="small"
                  style="width: 90px"
                  @change="onCurveStyleChange(idx, ci, 'lineStyle', $event)"
                >
                  <el-option v-for="ls in LINE_STYLES" :key="ls.value" :value="ls.value" :label="ls.label">
                    <span class="style-option">
                      <svg width="40" height="14"><line x1="0" y1="7" x2="40" y2="7"
                        :stroke="cs.color" stroke-width="2" :stroke-dasharray="ls.dash" /></svg>
                      <span>{{ ls.label }}</span>
                    </span>
                  </el-option>
                </el-select>
              </div>
              <div class="curve-style-row">
                <!-- Line width with SVG preview -->
                <el-select
                  :model-value="cs.lineWidth"
                  size="small"
                  style="width: 90px"
                  @change="onCurveStyleChange(idx, ci, 'lineWidth', $event)"
                >
                  <el-option v-for="lw in LINE_WIDTHS" :key="lw" :value="lw" :label="lw + 'px'">
                    <span class="style-option">
                      <svg width="40" height="14"><line x1="0" y1="7" x2="40" y2="7"
                        :stroke="cs.color" :stroke-width="lw" /></svg>
                      <span>{{ lw }}px</span>
                    </span>
                  </el-option>
                </el-select>
                <!-- Draw mode with SVG icons -->
                <el-select
                  :model-value="cs.drawMode || 'line'"
                  size="small"
                  style="width: 90px"
                  @change="onCurveStyleChange(idx, ci, 'drawMode', $event)"
                >
                  <el-option value="line" label="连线">
                    <span class="style-option">
                      <svg width="28" height="14"><polyline points="0,12 8,4 16,10 24,2 28,6"
                        fill="none" :stroke="cs.color" stroke-width="1.5" /></svg>
                      <span>连线</span>
                    </span>
                  </el-option>
                  <el-option value="bar" label="杠线">
                    <span class="style-option">
                      <svg width="28" height="14">
                        <line x1="0" y1="3" x2="20" y2="3" :stroke="cs.color" stroke-width="1.5" />
                        <line x1="0" y1="7" x2="14" y2="7" :stroke="cs.color" stroke-width="1.5" />
                        <line x1="0" y1="11" x2="24" y2="11" :stroke="cs.color" stroke-width="1.5" />
                      </svg>
                      <span>杠线</span>
                    </span>
                  </el-option>
                </el-select>
              </div>

              <!-- Scale group -->
              <div class="group-title">刻度</div>
              <div class="curve-range-row">
                <span>范围</span>
                <el-input-number
                  :model-value="cs.min"
                  size="small"
                  controls-position="right"
                  style="width: 90px"
                  @change="onCurveStyleChange(idx, ci, 'min', $event)"
                />
                <span>–</span>
                <el-input-number
                  :model-value="cs.max"
                  size="small"
                  controls-position="right"
                  style="width: 90px"
                  @change="onCurveStyleChange(idx, ci, 'max', $event)"
                />
              </div>
              <div class="curve-option-row">
                <el-checkbox
                  :model-value="cs.logarithmic || false"
                  size="small"
                  label="对数刻度"
                  @change="onCurveStyleChange(idx, ci, 'logarithmic', $event)"
                />
              </div>

              <!-- Fill group -->
              <div class="group-title">填充</div>
              <div class="fill-row">
                <el-checkbox
                  :model-value="!!cs.fill"
                  size="small"
                  label="填充"
                  @change="onToggleFill(idx, ci, $event as boolean)"
                />
                <template v-if="cs.fill">
                  <el-color-picker
                    :model-value="cs.fill.color"
                    size="small"
                    @change="onFillChange(idx, ci, 'color', $event)"
                  />
                  <el-radio-group
                    :model-value="cs.fill.direction"
                    size="small"
                    @change="onFillChange(idx, ci, 'direction', $event)"
                  >
                    <el-radio-button value="left">
                      <svg width="20" height="14" style="vertical-align: middle">
                        <rect x="0" y="0" width="12" height="14" fill="currentColor" opacity="0.3"/>
                        <polyline points="12,0 12,14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      </svg>
                    </el-radio-button>
                    <el-radio-button value="right">
                      <svg width="20" height="14" style="vertical-align: middle">
                        <rect x="8" y="0" width="12" height="14" fill="currentColor" opacity="0.3"/>
                        <polyline points="8,0 8,14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      </svg>
                    </el-radio-button>
                  </el-radio-group>
                </template>
              </div>
            </div>
          </template>

          <!-- Mineral track config -->
          <template v-if="track.type === 'mineral'">
            <div class="curve-list-header">
              <span>矿物 ({{ (track.mineralCurves || []).length }})</span>
              <el-button size="small" @click="onAddMineral(idx)">+ 矿物</el-button>
            </div>
            <div
              v-for="(mc, mi) in track.mineralCurves || []"
              :key="mi"
              class="curve-config-item"
            >
              <div class="curve-name-row">
                <el-select
                  :model-value="mc.curveName"
                  size="small"
                  filterable
                  placeholder="选择曲线"
                  style="flex:1"
                  @change="onMineralFieldChange(idx, mi, 'curveName', $event)"
                >
                  <el-option
                    v-for="c in availableCurves"
                    :key="c.name"
                    :label="`${c.name} (${c.unit})`"
                    :value="c.name"
                  />
                </el-select>
                <el-button
                  size="small"
                  :icon="Delete"
                  circle
                  @click="onRemoveMineral(idx, mi)"
                />
              </div>
              <div class="curve-style-row">
                <el-color-picker
                  :model-value="mc.color"
                  size="small"
                  @change="onMineralFieldChange(idx, mi, 'color', $event)"
                />
                <el-input
                  :model-value="mc.label"
                  size="small"
                  placeholder="标签"
                  style="flex:1"
                  @change="onMineralFieldChange(idx, mi, 'label', $event)"
                />
              </div>
            </div>
          </template>

          <!-- Text track config -->
          <template v-if="track.type === 'text'">
            <div class="curve-list-header">
              <span>文本段 ({{ (track.textContent || []).length }})</span>
              <el-button size="small" @click="onAddTextSegment(idx)">+ 文本段</el-button>
            </div>
            <div
              v-for="(seg, si) in track.textContent || []"
              :key="si"
              class="curve-config-item"
            >
              <div class="curve-range-row">
                <span>深度</span>
                <el-input-number
                  :model-value="seg.topDepth"
                  size="small"
                  :step="1"
                  controls-position="right"
                  style="width: 90px"
                  @change="onTextSegmentChange(idx, si, 'topDepth', $event)"
                />
                <span>–</span>
                <el-input-number
                  :model-value="seg.bottomDepth"
                  size="small"
                  :step="1"
                  controls-position="right"
                  style="width: 90px"
                  @change="onTextSegmentChange(idx, si, 'bottomDepth', $event)"
                />
              </div>
              <div class="curve-name-row">
                <el-input
                  :model-value="seg.text"
                  size="small"
                  placeholder="文本内容"
                  style="flex:1"
                  @change="onTextSegmentChange(idx, si, 'text', $event)"
                />
                <el-color-picker
                  :model-value="seg.color || '#333333'"
                  size="small"
                  @change="onTextSegmentChange(idx, si, 'color', $event)"
                />
                <el-button
                  size="small"
                  :icon="Delete"
                  circle
                  @click="onRemoveTextSegment(idx, si)"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { CompositeLogConfig, TrackType, MineralCurveConfig, TextSegment, LineStyleType, GridConfig } from '@/types/compositeLog'
import { createDefaultCurveStyle, nextTrackId, CURVE_PRESETS, MINERAL_COLORS, defaultGridConfig } from '@/types/compositeLog'
import type { WellInfo, CurveInfo } from '@/types/well'

const props = defineProps<{
  config: CompositeLogConfig
  wells: WellInfo[]
  selectedWell: string
  availableCurves: CurveInfo[]
}>()

const emit = defineEmits<{
  'update:config': [config: CompositeLogConfig]
  'update:selectedWell': [name: string]
}>()

const expandedTrackId = ref<string | null>(null)

// expose for parent to programmatically expand a track
function expandTrack(trackId: string) {
  expandedTrackId.value = trackId
}
defineExpose({ expandTrack })

// ── Constants for visual dropdowns ──

const LINE_STYLES: Array<{ value: LineStyleType; label: string; dash: string }> = [
  { value: 'solid', label: '实线', dash: '' },
  { value: 'dashed', label: '虚线', dash: '6,3' },
  { value: 'dotted', label: '点线', dash: '2,2' }
]

const LINE_WIDTHS = [0.5, 1, 1.5, 2, 3, 5]

const GRID_WIDTHS = [0.2, 0.3, 0.5, 1, 1.5, 2]

function lineDash(style: LineStyleType): string {
  const found = LINE_STYLES.find(ls => ls.value === style)
  return found?.dash || ''
}

// ── Grid config ──

const gridConfig = computed<GridConfig>(() => {
  return props.config.grid || defaultGridConfig()
})

function onGridFieldChange(field: string, val: unknown) {
  const newGrid = { ...gridConfig.value, [field]: val }
  emitConfig({ grid: newGrid })
}

// ── Track type labels ──

const TRACK_TYPE_LABELS: Record<string, string> = {
  formation: '地层',
  depth: '深度',
  lithology: '岩性',
  curve: '曲线',
  discrete: '离散',
  interpretation: '解释',
  mineral: '矿物',
  text: '文本'
}

function trackTypeLabel(type: string): string {
  return TRACK_TYPE_LABELS[type] || type
}

function toggleExpand(id: string) {
  expandedTrackId.value = expandedTrackId.value === id ? null : id
}

function emitConfig(patch: Partial<CompositeLogConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function onDepthMinChange(val: number | undefined) {
  if (val === undefined) return
  emitConfig({ depthRange: { ...props.config.depthRange, min: val } })
}

function onDepthMaxChange(val: number | undefined) {
  if (val === undefined) return
  emitConfig({ depthRange: { ...props.config.depthRange, max: val } })
}

// ── Drag sort ──

const dragIdx = ref(-1)
const dragOverIdx = ref(-1)

function onDragStart(idx: number, e: DragEvent) {
  dragIdx.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

function onDragOver(idx: number) {
  dragOverIdx.value = idx
}

function onDragLeave() {
  dragOverIdx.value = -1
}

function onDrop(targetIdx: number) {
  const fromIdx = dragIdx.value
  if (fromIdx < 0 || fromIdx === targetIdx) {
    dragOverIdx.value = -1
    return
  }
  const tracks = [...props.config.tracks]
  const [moved] = tracks.splice(fromIdx, 1)
  tracks.splice(targetIdx, 0, moved)
  emitConfig({ tracks })
  dragOverIdx.value = -1
}

function onDragEnd() {
  dragIdx.value = -1
  dragOverIdx.value = -1
}

// ── Track management ──

const TRACK_DEFAULTS: Record<string, { title: string; width: number }> = {
  formation: { title: '地层', width: 80 },
  depth: { title: '深度(m)', width: 55 },
  lithology: { title: '岩性', width: 55 },
  curve: { title: '新曲线道', width: 140 },
  discrete: { title: '离散曲线', width: 120 },
  interpretation: { title: '解释结论', width: 80 },
  mineral: { title: '矿物含量', width: 120 },
  text: { title: '综合结论', width: 80 }
}

function onAddTrack(type: string) {
  const defaults = TRACK_DEFAULTS[type] || { title: type, width: 100 }
  const newTrack: Record<string, unknown> = {
    id: nextTrackId(),
    type: type as TrackType,
    title: defaults.title,
    width: defaults.width,
    visible: true
  }
  if (type === 'curve' || type === 'discrete') {
    newTrack.curves = []
  } else if (type === 'mineral') {
    newTrack.mineralCurves = []
  } else if (type === 'text') {
    newTrack.textContent = []
  }
  emitConfig({ tracks: [...props.config.tracks, newTrack as any] })
}

function onRemoveTrack(idx: number) {
  const tracks = [...props.config.tracks]
  tracks.splice(idx, 1)
  emitConfig({ tracks })
}

function onToggleVisible(idx: number, val: boolean) {
  const tracks = [...props.config.tracks]
  tracks[idx] = { ...tracks[idx], visible: val }
  emitConfig({ tracks })
}

function onTrackFieldChange(idx: number, field: string, val: unknown) {
  const tracks = [...props.config.tracks]
  tracks[idx] = { ...tracks[idx], [field]: val }
  emitConfig({ tracks })
}

// ── Curve style management ──

function onAddCurveToTrack(idx: number) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[idx] }
  track.curves = [...(track.curves || []), createDefaultCurveStyle('')]
  tracks[idx] = track
  emitConfig({ tracks })
}

function onRemoveCurve(trackIdx: number, curveIdx: number) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const curves = [...(track.curves || [])]
  curves.splice(curveIdx, 1)
  track.curves = curves
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onCurveNameChange(trackIdx: number, curveIdx: number, newName: string) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const curves = [...(track.curves || [])]

  const preset = CURVE_PRESETS[newName]
  if (preset) {
    curves[curveIdx] = {
      ...curves[curveIdx],
      curveName: newName,
      color: preset.color,
      lineWidth: preset.lineWidth,
      min: preset.min,
      max: preset.max,
      logarithmic: preset.logarithmic
    }
  } else {
    curves[curveIdx] = { ...curves[curveIdx], curveName: newName }
  }

  track.curves = curves
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onCurveStyleChange(trackIdx: number, curveIdx: number, field: string, val: unknown) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const curves = [...(track.curves || [])]
  curves[curveIdx] = { ...curves[curveIdx], [field]: val }
  track.curves = curves
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

// ── Fill management ──

function onToggleFill(trackIdx: number, curveIdx: number, enabled: boolean) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const curves = [...(track.curves || [])]
  if (enabled) {
    curves[curveIdx] = {
      ...curves[curveIdx],
      fill: { color: curves[curveIdx].color, direction: 'left' }
    }
  } else {
    const { fill: _, ...rest } = curves[curveIdx]
    curves[curveIdx] = rest as typeof curves[number]
  }
  track.curves = curves
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onFillChange(trackIdx: number, curveIdx: number, field: 'color' | 'direction', val: unknown) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const curves = [...(track.curves || [])]
  const cs = curves[curveIdx]
  if (cs.fill) {
    curves[curveIdx] = {
      ...cs,
      fill: { ...cs.fill, [field]: val }
    }
  }
  track.curves = curves
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

// ── Mineral management ──

function onAddMineral(trackIdx: number) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const minerals = [...(track.mineralCurves || [])]
  // pick a default color from MINERAL_COLORS that isn't used yet
  const usedColors = new Set(minerals.map((m) => m.color))
  const defaultColor = Object.values(MINERAL_COLORS).find((c) => !usedColors.has(c)) || '#999999'
  minerals.push({ curveName: '', color: defaultColor, label: '' })
  track.mineralCurves = minerals
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onRemoveMineral(trackIdx: number, mineralIdx: number) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const minerals = [...(track.mineralCurves || [])]
  minerals.splice(mineralIdx, 1)
  track.mineralCurves = minerals
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onMineralFieldChange(trackIdx: number, mineralIdx: number, field: keyof MineralCurveConfig, val: unknown) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const minerals = [...(track.mineralCurves || [])]
  minerals[mineralIdx] = { ...minerals[mineralIdx], [field]: val }
  // auto-set label from curveName if label is empty
  if (field === 'curveName' && !minerals[mineralIdx].label) {
    minerals[mineralIdx] = { ...minerals[mineralIdx], label: val as string }
  }
  track.mineralCurves = minerals
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

// ── Text segment management ──

function onAddTextSegment(trackIdx: number) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const segments = [...(track.textContent || [])]
  const lastBottom = segments.length > 0 ? segments[segments.length - 1].bottomDepth : props.config.depthRange.min
  segments.push({
    topDepth: lastBottom,
    bottomDepth: lastBottom + 50,
    text: '',
    color: '#333333'
  })
  track.textContent = segments
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onRemoveTextSegment(trackIdx: number, segIdx: number) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const segments = [...(track.textContent || [])]
  segments.splice(segIdx, 1)
  track.textContent = segments
  tracks[trackIdx] = track
  emitConfig({ tracks })
}

function onTextSegmentChange(trackIdx: number, segIdx: number, field: keyof TextSegment, val: unknown) {
  const tracks = [...props.config.tracks]
  const track = { ...tracks[trackIdx] }
  const segments = [...(track.textContent || [])]
  segments[segIdx] = { ...segments[segIdx], [field]: val }
  track.textContent = segments
  tracks[trackIdx] = track
  emitConfig({ tracks })
}
</script>

<style scoped lang="scss">
.track-config-panel {
  width: 260px;
  min-width: 260px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  background: #fafafa;
  padding: 8px;
  font-size: 12px;
}

.panel-section {
  margin-bottom: 12px;
}

.section-title {
  font-weight: bold;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.depth-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  .depth-sep {
    margin: 0 2px;
  }
  .el-input-number {
    flex: 1;
  }
}

.empty-hint {
  color: #999;
  text-align: center;
  padding: 12px 0;
  font-style: italic;
}

.track-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 4px;
  background: #fff;
  transition: border-color 0.15s;
  &.drag-over {
    border-color: #409eff;
    border-top: 2px solid #409eff;
  }
}

.track-header {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  cursor: pointer;
  gap: 4px;
  &:hover {
    background: #f5f5f5;
  }
}

.drag-handle {
  cursor: grab;
  color: #bbb;
  font-size: 12px;
  padding: 0 2px;
  user-select: none;
  &:hover {
    color: #666;
  }
}

.track-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-type-tag {
  font-size: 10px;
  color: #909399;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 2px;
}

.track-delete-btn {
  opacity: 0.4;
  &:hover {
    opacity: 1;
  }
}

.track-detail {
  padding: 6px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  > span {
    min-width: 30px;
    color: #666;
  }
}

.curve-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
  color: #333;
}

.curve-config-item {
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.curve-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.curve-preview {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 2px 4px;
  svg {
    display: block;
  }
}

.group-title {
  font-size: 10px;
  color: #999;
  font-weight: bold;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 2px;
  margin-top: 2px;
}

.curve-style-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.curve-range-row {
  display: flex;
  align-items: center;
  gap: 4px;
  > span {
    font-size: 11px;
    color: #666;
  }
}

.curve-option-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fill-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.style-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  svg {
    flex-shrink: 0;
  }
}

.grid-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.grid-label {
  min-width: 24px;
  font-size: 11px;
  color: #666;
}
</style>
