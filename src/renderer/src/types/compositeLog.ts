// ── Composite Well Log Plot — 综合柱状图类型定义 ──

export type TrackType
  = | 'formation' // 地层分层
    | 'depth' // 深度刻度
    | 'lithology' // 岩性花纹
    | 'curve' // 连续曲线（支持多条叠加）
    | 'discrete' // 离散曲线
    | 'interpretation' // 测井解释结论
    | 'mineral' // 矿物百分比堆叠
    | 'text' // 综合结论文本

export type LineStyleType = 'solid' | 'dashed' | 'dotted'
export type DrawMode = 'line' | 'bar'

/** 单条曲线在道内的显示样式 */
export interface CurveStyle {
  curveName: string
  color: string
  lineWidth: number
  lineStyle: LineStyleType
  drawMode?: DrawMode // 默认 'line'
  unit?: string
  min: number
  max: number
  logarithmic?: boolean
  /** 面积填充: color 填充色, direction 填充方向 */
  fill?: { color: string, direction: 'left' | 'right' }
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

export interface LithologyPatternDef {
  keywords: string[] // 任一关键词命中即匹配
  patternType: string // 花纹绘制器名
  color: string // 底色
  label: string // 图例标注
}

/**
 * 按优先级排列：先匹配更具体的（如"泥页岩"先于"泥岩"）
 */
export const LITHOLOGY_PATTERNS: LithologyPatternDef[] = [
  { keywords: ['砾岩'], patternType: 'conglomerate', color: '#FFE4B5', label: '砾岩' },
  { keywords: ['粗砂岩'], patternType: 'sandstone_coarse', color: '#FFDEAD', label: '粗砂岩' },
  { keywords: ['中砂岩'], patternType: 'sandstone_medium', color: '#FFFACD', label: '中砂岩' },
  { keywords: ['细砂岩'], patternType: 'sandstone_fine', color: '#FFF8DC', label: '细砂岩' },
  { keywords: ['粉砂岩'], patternType: 'siltstone', color: '#F5DEB3', label: '粉砂岩' },
  { keywords: ['泥质砂岩'], patternType: 'muddy_sandstone', color: '#DEB887', label: '泥质砂岩' },
  { keywords: ['砂质泥岩'], patternType: 'sandy_mudstone', color: '#C0C0C0', label: '砂质泥岩' },
  { keywords: ['泥页岩', '页岩'], patternType: 'shale', color: '#778899', label: '页岩' },
  { keywords: ['泥岩'], patternType: 'mudstone', color: '#A9A9A9', label: '泥岩' },
  { keywords: ['白云岩'], patternType: 'dolomite', color: '#DDA0DD', label: '白云岩' },
  { keywords: ['泥灰岩'], patternType: 'marl', color: '#B0C4DE', label: '泥灰岩' },
  { keywords: ['石灰岩', '灰岩', '钙质'], patternType: 'limestone', color: '#87CEEB', label: '石灰岩' },
  { keywords: ['煤'], patternType: 'coal', color: '#2F4F4F', label: '煤层' },
  { keywords: ['砂岩'], patternType: 'sandstone', color: '#FFFACD', label: '砂岩' },
]

/**
 * 根据岩性文本描述匹配花纹定义
 */
export function matchLithology(description: string): LithologyPatternDef | null {
  for (const def of LITHOLOGY_PATTERNS) {
    if (def.keywords.some(kw => description.includes(kw))) {
      return def
    }
  }
  return null
}

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
  井径: { min: 150, max: 350, color: '#000000', lineWidth: 1, unit: 'mm' },
  自然电位: { min: -100, max: 100, color: '#0000FF', lineWidth: 1, unit: 'mV' },
  自然伽马: { min: 0, max: 200, color: '#008000', lineWidth: 1, unit: 'API' },
  浅侧向: { min: 0.1, max: 10000, color: '#FF0000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
  深侧向: { min: 0.1, max: 10000, color: '#800000', lineWidth: 1, unit: 'Ωm', logarithmic: true },
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
  CAL: { min: 150, max: 350, color: '#000000', lineWidth: 1, unit: 'mm' },
  DEN: { min: 1.5, max: 3.0, color: '#8B0000', lineWidth: 1, unit: 'g/cm³' },
  CNL: { min: 0, max: 60, color: '#0000CD', lineWidth: 1, unit: '%' },
}

// ── 工厂函数 ──

let _trackIdCounter = 0

export function nextTrackId(): string {
  return `track_${++_trackIdCounter}_${Date.now()}`
}

export function createDefaultCurveStyle(curveName: string): CurveStyle {
  const preset = CURVE_PRESETS[curveName]
  if (preset) {
    return {
      curveName,
      color: preset.color,
      lineWidth: preset.lineWidth,
      lineStyle: 'solid',
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
  const has = (name: string) => curveNames.includes(name)
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
    if (has('井径') || has('CAL'))
      curves.push(createDefaultCurveStyle(has('井径') ? '井径' : 'CAL'))
    if (has('自然电位') || has('SP'))
      curves.push(createDefaultCurveStyle(has('自然电位') ? '自然电位' : 'SP'))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '井径/自然电位', width: 140, visible: true, curves })
    }
  }

  // 5. 自然伽马 + 声波
  {
    const curves: CurveStyle[] = []
    if (has('自然伽马') || has('GR'))
      curves.push(createDefaultCurveStyle(has('自然伽马') ? '自然伽马' : 'GR'))
    if (has('DT') || has('AC'))
      curves.push(createDefaultCurveStyle(has('DT') ? 'DT' : 'AC'))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '伽马/声波', width: 140, visible: true, curves })
    }
  }

  // 6. 电阻率
  {
    const curves: CurveStyle[] = []
    if (has('浅侧向'))
      curves.push(createDefaultCurveStyle('浅侧向'))
    if (has('深侧向'))
      curves.push(createDefaultCurveStyle('深侧向'))
    if (has('RT'))
      curves.push(createDefaultCurveStyle('RT'))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '电阻率', width: 140, visible: true, curves })
    }
  }

  // 7. 孔隙度 + 密度 + 中子
  {
    const curves: CurveStyle[] = []
    if (has('岩性密度') || has('DEN'))
      curves.push(createDefaultCurveStyle(has('岩性密度') ? '岩性密度' : 'DEN'))
    if (has('补偿中子孔隙度') || has('CNL'))
      curves.push(createDefaultCurveStyle(has('补偿中子孔隙度') ? '补偿中子孔隙度' : 'CNL'))
    if (has('孔隙度'))
      curves.push(createDefaultCurveStyle('孔隙度'))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: '密度/中子/孔隙', width: 140, visible: true, curves })
    }
  }

  // 8. TOC + 脆性
  {
    const curves: CurveStyle[] = []
    if (has('测井TOC'))
      curves.push(createDefaultCurveStyle('测井TOC'))
    if (has('脆性指数'))
      curves.push(createDefaultCurveStyle('脆性指数'))
    if (curves.length) {
      tracks.push({ id: nextTrackId(), type: 'curve', title: 'TOC/脆性', width: 140, visible: true, curves })
    }
  }

  // 9. 解释结论
  tracks.push({ id: nextTrackId(), type: 'interpretation', title: '解释结论', width: 80, visible: true })

  return tracks
}
