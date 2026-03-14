// ── Composite Well Log Plot — 综合柱状图类型定义 ──

export type TrackType
  = | 'formation' // 地层分层
    | 'depth' // 深度刻度
    | 'lithology' // 岩性花纹
    | 'curve' // 连续曲线（支持多条叠加）
    | 'discrete' // 离散曲线
    | 'fracture' // 裂缝图片道
    | 'interpretation' // 测井解释结论
    | 'mineral' // 矿物百分比堆叠
    | 'text' // 综合结论文本

export type LineStyleType = 'solid' | 'dashed' | 'dotted'
export type DrawMode = 'line' | 'bar'

export interface CurveColorRamp {
  low: string
  mid: string
  high: string
}

export const DEFAULT_CURVE_COLOR_RAMP: CurveColorRamp = {
  low: '#1e88e5',
  mid: '#fdd835',
  high: '#e53935',
}

/** 单条曲线在道内的显示样式 */
export interface CurveStyle {
  curveName: string
  color: string
  lineWidth: number
  lineStyle: LineStyleType
  drawMode?: DrawMode // 默认 'line'
  valueColoring?: boolean
  colorRamp?: CurveColorRamp
  unit?: string
  min: number
  max: number
  logarithmic?: boolean
  /** 面积填充: color 填充色, direction 填充方向 */
  fill?: { color: string, direction: 'left' | 'right', customColor?: boolean, opacity?: number }
  /** 表头文字样式 */
  fontSize?: number // 默认 9
  fontColor?: string // 默认 '#333'
  fontBold?: boolean
  fontItalic?: boolean
}

/** 网格配置 */
export interface GridConfig {
  enabled: boolean
  majorInterval: number // 主网格等分数
  minorInterval: number // 次网格等分数（0=不显示）
  majorColor: string
  majorWidth: number
  minorColor: string
  minorWidth: number
}

export function defaultGridConfig(): GridConfig {
  return {
    enabled: true,
    majorInterval: 5,
    minorInterval: 0,
    majorColor: '#e0e0e0',
    majorWidth: 0.5,
    minorColor: '#f0f0f0',
    minorWidth: 0.3,
  }
}

/** 矿物百分比道中单个矿物的配置 */
export interface MineralCurveConfig {
  curveName: string
  color: string
  label: string
}

/** 文本道中的文本段 */
export interface TextSegment {
  topDepth: number
  bottomDepth: number
  text: string
  color?: string
}

export interface FractureImageConfig {
  id: string
  name: string
  src: string
  leftRatio: number
  rightRatio: number
  topDepth: number
  bottomDepth: number
  opacity?: number
}

/** 单个道的配置 */
export interface TrackConfig {
  id: string
  type: TrackType
  title: string
  width: number // 像素宽度
  visible: boolean
  curves?: CurveStyle[] // type='curve' | 'discrete'
  formationColumn?: 'name' | 'code' // type='formation' 用
  bgColor?: string // 道背景色
  mineralCurves?: MineralCurveConfig[] // type='mineral' 用
  textContent?: TextSegment[] // type='text' 用
  fractureImages?: FractureImageConfig[] // type='fracture' 用
}

/** 整图配置（序列化到 result_charts.config） */
export interface CompositeLogConfig {
  wellName: string
  title: string
  depthRange: { min: number, max: number }
  scale: number // e.g. 200 → 1:200
  tracks: TrackConfig[]
  grid?: GridConfig
}

// ── 岩性关键词 → 花纹 ──
// 岩性描述往往是 "灰黑色荧光泥岩" 等长文本，需要关键词匹配

// LithologyPatternDef kept for backward compat but no longer used for rendering.
// Pattern matching is now in lithologyPatterns.ts (matchLithologyId → 301 GB/T 958 patterns)

// ── 解释结论颜色 ──

export const INTERPRETATION_COLORS: Record<string, string> = {
  油层: '#228B22',
  差油层: '#9ACD32',
  油水同层: '#32CD32',
  含油气: '#66CDAA',
  气层: '#FF4500',
  水层: '#4169E1',
  干层: '#D2B48C',
  一类层: '#FF6347',
  二类层: '#FFA500',
  三类层: '#FFD700',
}

// ── 矿物百分比默认色表 ──

export const MINERAL_COLORS: Record<string, string> = {
  石英: '#FFD700',
  长石: '#FF6347',
  方解石: '#87CEEB',
  白云石: '#DDA0DD',
  黏土: '#8B4513',
  有机质: '#2F4F4F',
  云母: '#9370DB',
  黄铁矿: '#B8860B',
  石膏: '#FFF0F5',
  岩盐: '#E0FFFF',
}

// ── 常见曲线的推荐范围/颜色 ──

export interface CurvePreset {
  min: number
  max: number
  color: string
  lineWidth: number
  unit: string
  logarithmic?: boolean
}

export const CURVE_PRESETS: Record<string, CurvePreset> = {
  井径: { min: 0, max: 50, color: '#000000', lineWidth: 1, unit: 'cm' },
  自然电位: { min: -300, max: 300, color: '#0000FF', lineWidth: 1, unit: 'mV' },
  自然伽马: { min: 0, max: 200, color: '#008000', lineWidth: 1, unit: 'API' },
  浅侧向: { min: 0.1, max: 10000, color: '#FF0000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  深侧向: { min: 0.1, max: 10000, color: '#800000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  浅电阻: { min: 0.1, max: 10000, color: '#FF0000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  深电阻: { min: 0.1, max: 10000, color: '#800000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  电阻率: { min: 0.1, max: 10000, color: '#FF0000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  DT: { min: 40, max: 140, color: '#FF00FF', lineWidth: 1, unit: 'μs/ft' },
  补偿中子孔隙度: { min: 0, max: 60, color: '#0000CD', lineWidth: 1, unit: '%' },
  岩性密度: { min: 1.5, max: 3.0, color: '#8B0000', lineWidth: 1, unit: 'g/cm³' },
  孔隙度: { min: 0, max: 30, color: '#4169E1', lineWidth: 1, unit: '%' },
  测井TOC: { min: 0, max: 10, color: '#2F4F4F', lineWidth: 1.5, unit: '%' },
  脆性指数: { min: 0, max: 100, color: '#FF8C00', lineWidth: 1, unit: '%' },
  GR: { min: 0, max: 200, color: '#008000', lineWidth: 1, unit: 'API' },
  SP: { min: -100, max: 100, color: '#0000FF', lineWidth: 1, unit: 'mV' },
  AC: { min: 40, max: 140, color: '#FF00FF', lineWidth: 1, unit: 'μs/ft' },
  RT: { min: 0.1, max: 10000, color: '#FF0000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  CAL: { min: 0, max: 50, color: '#000000', lineWidth: 1, unit: 'cm' },
  CALI: { min: 0, max: 50, color: '#000000', lineWidth: 1, unit: 'cm' },
  CALI1: { min: 0, max: 50, color: '#000000', lineWidth: 1, unit: 'cm' },
  DEN: { min: 1.5, max: 3.0, color: '#8B0000', lineWidth: 1, unit: 'g/cm³' },
  CNL: { min: 0, max: 60, color: '#0000CD', lineWidth: 1, unit: '%' },
}

const LEGACY_CURVE_PRESETS: Record<string, Pick<CurvePreset, 'min' | 'max' | 'unit'>> = {
  井径: { min: 150, max: 350, unit: 'mm' },
  CAL: { min: 150, max: 350, unit: 'mm' },
  CALI: { min: 150, max: 350, unit: 'mm' },
  CALI1: { min: 150, max: 350, unit: 'mm' },
  自然电位: { min: -100, max: 100, unit: 'mV' },
  SP: { min: -100, max: 100, unit: 'mV' },
}

const CURVE_PRESET_ALIASES: Array<{ key: string, aliases: string[] }> = [
  { key: '井径', aliases: ['井径', 'CAL', 'CALI', 'CALI1', '井眼', '井眼直径'] },
  { key: '自然电位', aliases: ['自然电位', 'SP', '电位', '自然电位SP'] },
  { key: '自然伽马', aliases: ['自然伽马', 'GR', '伽马'] },
  { key: '浅侧向', aliases: ['浅侧向', '浅电阻', '浅电阻率', 'RLLS', 'LLS'] },
  { key: '深侧向', aliases: ['深侧向', '深电阻', '深电阻率', 'RT', 'RLLD', 'LLD', '电阻率'] },
  { key: 'DT', aliases: ['DT', 'AC', '声波', '声波时差'] },
  { key: '补偿中子孔隙度', aliases: ['补偿中子孔隙度', 'CNL', '中子', '中子孔隙度'] },
  { key: '岩性密度', aliases: ['岩性密度', 'DEN', '密度'] },
  { key: '孔隙度', aliases: ['孔隙度', 'PHI', 'POR'] },
  { key: '测井TOC', aliases: ['测井TOC', 'TOC'] },
  { key: '脆性指数', aliases: ['脆性指数', 'BI'] },
]

export function resolveCurvePresetKey(curveName: string): string | null {
  if (CURVE_PRESETS[curveName]) {
    return curveName
  }
  const normalized = curveName.trim().toUpperCase()
  for (const group of CURVE_PRESET_ALIASES) {
    if (group.aliases.some(alias => normalized === alias.toUpperCase())) {
      return group.key
    }
  }
  for (const group of CURVE_PRESET_ALIASES) {
    if (group.aliases.some(alias => normalized.includes(alias.toUpperCase()))) {
      return group.key
    }
  }
  return null
}

export function getCurvePreset(curveName: string): CurvePreset | undefined {
  const presetKey = resolveCurvePresetKey(curveName)
  return presetKey ? CURVE_PRESETS[presetKey] : undefined
}

export function normalizeCurveStyle(curveStyle: CurveStyle): CurveStyle {
  const normalized: CurveStyle = {
    ...curveStyle,
    valueColoring: curveStyle.valueColoring ?? true,
    colorRamp: curveStyle.colorRamp ? { ...curveStyle.colorRamp } : { ...DEFAULT_CURVE_COLOR_RAMP },
    fill: curveStyle.fill
      ? {
          ...curveStyle.fill,
          customColor: curveStyle.fill.customColor ?? (curveStyle.fill.color !== curveStyle.color),
          opacity: Math.max(0, Math.min(1, curveStyle.fill.opacity ?? 1)),
        }
      : undefined,
  }
  const presetKey = resolveCurvePresetKey(curveStyle.curveName)
  if (presetKey) {
    const preset = CURVE_PRESETS[presetKey]
    const legacyPreset = LEGACY_CURVE_PRESETS[curveStyle.curveName] || LEGACY_CURVE_PRESETS[presetKey]
    const isLegacyRange = !!legacyPreset
      && curveStyle.min === legacyPreset.min
      && curveStyle.max === legacyPreset.max
      && (curveStyle.unit || legacyPreset.unit) === legacyPreset.unit

    if (!normalized.unit) {
      normalized.unit = preset.unit
    }
    if (normalized.logarithmic === undefined && preset.logarithmic !== undefined) {
      normalized.logarithmic = preset.logarithmic
    }
    if (isLegacyRange) {
      normalized.min = preset.min
      normalized.max = preset.max
      normalized.unit = preset.unit
      normalized.logarithmic = preset.logarithmic
    }
  }
  if (!Number.isFinite(normalized.min)) {
    normalized.min = 0
  }
  if (!Number.isFinite(normalized.max)) {
    normalized.max = normalized.min + 1
  }
  if (normalized.logarithmic) {
    if (normalized.max <= 0) {
      normalized.max = 10
    }
    if (normalized.min <= 0) {
      normalized.min = Math.max(0.1, normalized.max / 1000)
    }
    if (normalized.max <= normalized.min) {
      normalized.max = normalized.min * 10
    }
  }
  else if (normalized.max <= normalized.min) {
    normalized.max = normalized.min + 1
  }
  return normalized
}

export function normalizeFractureImage(image: FractureImageConfig): FractureImageConfig {
  let leftRatio = Number.isFinite(image.leftRatio) ? image.leftRatio : 0.1
  let rightRatio = Number.isFinite(image.rightRatio) ? image.rightRatio : 0.9
  if (rightRatio < leftRatio) {
    [leftRatio, rightRatio] = [rightRatio, leftRatio]
  }
  let widthRatio = Math.max(0.08, rightRatio - leftRatio)
  widthRatio = Math.min(widthRatio, 1)
  leftRatio = Math.max(0, Math.min(leftRatio, 1 - widthRatio))
  rightRatio = leftRatio + widthRatio

  let topDepth = Number.isFinite(image.topDepth) ? image.topDepth : 0
  let bottomDepth = Number.isFinite(image.bottomDepth) ? image.bottomDepth : topDepth + 10
  if (bottomDepth < topDepth) {
    [topDepth, bottomDepth] = [bottomDepth, topDepth]
  }
  if (bottomDepth <= topDepth) {
    bottomDepth = topDepth + 1
  }

  return {
    ...image,
    name: image.name || '裂缝图片',
    leftRatio,
    rightRatio,
    topDepth,
    bottomDepth,
    opacity: Math.max(0.1, Math.min(1, image.opacity ?? 1)),
  }
}

export function normalizeTracksCurveStyles(tracks: TrackConfig[]): TrackConfig[] {
  return tracks.map((track) => {
    return {
      ...track,
      curves: track.curves?.map(normalizeCurveStyle),
      fractureImages: track.fractureImages?.map(normalizeFractureImage),
    }
  })
}

function findCurveName(curveNames: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map(alias => alias.toUpperCase())
  for (const curveName of curveNames) {
    if (normalizedAliases.includes(curveName.trim().toUpperCase())) {
      return curveName
    }
  }
  for (const curveName of curveNames) {
    const normalized = curveName.trim().toUpperCase()
    if (normalizedAliases.some(alias => normalized.includes(alias))) {
      return curveName
    }
  }
  return null
}

// ── 工厂函数 ──

let _trackIdCounter = 0

function nextEntityId(prefix: string): string {
  return `${prefix}_${++_trackIdCounter}_${Date.now()}`
}

export function nextTrackId(): string {
  return nextEntityId('track')
}

export function nextFractureImageId(): string {
  return nextEntityId('fracture_img')
}

export function createDefaultCurveStyle(curveName: string): CurveStyle {
  const preset = getCurvePreset(curveName)
  if (preset) {
    return {
      curveName,
      color: preset.color,
      lineWidth: preset.lineWidth,
      lineStyle: 'solid',
      valueColoring: true,
      colorRamp: { ...DEFAULT_CURVE_COLOR_RAMP },
      unit: preset.unit,
      min: preset.min,
      max: preset.max,
      logarithmic: preset.logarithmic,
    }
  }
  return {
    curveName,
    color: '#000000',
    lineWidth: 1,
    lineStyle: 'solid',
    valueColoring: true,
    colorRamp: { ...DEFAULT_CURVE_COLOR_RAMP },
    min: 0,
    max: 100,
  }
}

/**
 * 创建空配置 —— 选井时使用，不自动覆盖 tracks
 */
export function createEmptyConfig(wellName: string, depthRange: { min: number, max: number }): CompositeLogConfig {
  return {
    wellName,
    title: `${wellName} 综合柱状图`,
    depthRange,
    scale: 200,
    tracks: [],
  }
}

/**
 * 推荐道布局 —— 模仿专业综合柱状图（仅手动触发，不自动调用）
 */
export function createSuggestedTracks(curveNames: string[]): TrackConfig[] {
  const tracks: TrackConfig[] = []

  // 1. 地层
  tracks.push({ id: nextTrackId(), type: 'formation', title: '地层', width: 80, visible: true })

  // 2. 深度
  tracks.push({ id: nextTrackId(), type: 'depth', title: '深度(m)', width: 55, visible: true })

  // 3. 岩性
  tracks.push({ id: nextTrackId(), type: 'lithology', title: '岩性', width: 55, visible: true })

  // 4. 井径 + 自然电位
  {
    const curves: CurveStyle[] = []
    const caliper = findCurveName(curveNames, ['井径', 'CAL', 'CALI', 'CALI1', '井眼', '井眼直径'])
    const spontaneous = findCurveName(curveNames, ['自然电位', 'SP', '电位', '自然电位SP'])
    if (caliper)
      curves.push(createDefaultCurveStyle(caliper))
    if (spontaneous)
      curves.push(createDefaultCurveStyle(spontaneous))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '井径/自然电位', width: 140, visible: true, curves })
    }
  }

  // 5. 自然伽马 + 声波
  {
    const curves: CurveStyle[] = []
    const gamma = findCurveName(curveNames, ['自然伽马', 'GR', '伽马'])
    const sonic = findCurveName(curveNames, ['DT', 'AC', '声波', '声波时差'])
    if (gamma)
      curves.push(createDefaultCurveStyle(gamma))
    if (sonic)
      curves.push(createDefaultCurveStyle(sonic))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '伽马/声波', width: 140, visible: true, curves })
    }
  }

  // 6. 电阻率
  {
    const curves: CurveStyle[] = []
    const shallow = findCurveName(curveNames, ['浅侧向', '浅电阻', '浅电阻率', 'RLLS', 'LLS'])
    const deep = findCurveName(curveNames, ['深侧向', '深电阻', '深电阻率', 'RLLD', 'LLD'])
    const rt = findCurveName(curveNames, ['RT', '电阻率'])
    if (shallow)
      curves.push(createDefaultCurveStyle(shallow))
    if (deep)
      curves.push(createDefaultCurveStyle(deep))
    if (rt && rt !== deep)
      curves.push(createDefaultCurveStyle(rt))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '电阻率', width: 140, visible: true, curves })
    }
  }

  // 7. 孔隙度 + 密度 + 中子
  {
    const curves: CurveStyle[] = []
    const density = findCurveName(curveNames, ['岩性密度', 'DEN', '密度'])
    const neutron = findCurveName(curveNames, ['补偿中子孔隙度', 'CNL', '中子', '中子孔隙度'])
    const porosity = findCurveName(curveNames, ['孔隙度', 'PHI', 'POR'])
    if (density)
      curves.push(createDefaultCurveStyle(density))
    if (neutron)
      curves.push(createDefaultCurveStyle(neutron))
    if (porosity)
      curves.push(createDefaultCurveStyle(porosity))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '密度/中子/孔隙', width: 140, visible: true, curves })
    }
  }

  // 8. TOC + 脆性
  {
    const curves: CurveStyle[] = []
    const toc = findCurveName(curveNames, ['测井TOC', 'TOC'])
    const brittleness = findCurveName(curveNames, ['脆性指数', 'BI'])
    if (toc)
      curves.push(createDefaultCurveStyle(toc))
    if (brittleness)
      curves.push(createDefaultCurveStyle(brittleness))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: 'TOC/脆性', width: 140, visible: true, curves })
    }
  }

  // 9. 解释结论
  tracks.push({ id: nextTrackId(), type: 'interpretation', title: '解释结论', width: 96, visible: true })

  return tracks
}
