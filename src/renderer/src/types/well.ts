export interface WellInfo {
  id: number
  name: string
  x: number | null
  y: number | null
  kb: number | null
  td: number | null
}

export interface CurveInfo {
  id: number
  name: string
  unit: string
  sample_interval: number
}

export interface CurveDataPoint {
  depth: number
  value: number | null
}

export type CurveDataResponse = Record<string, CurveDataPoint[]>

export interface LayerInfo {
  id: number
  formation: string
  top_depth: number
  bottom_depth: number
}

export interface LithologyInfo {
  id: number
  top_depth: number
  bottom_depth: number
  description: string
}

export interface InterpretationInfo {
  id: number
  top_depth: number
  bottom_depth: number
  conclusion: string
  category: string
}

export interface DataTypeOption {
  label: string
  value: string
  needsWellName: boolean
}

export const DATA_TYPES: DataTypeOption[] = [
  { label: '井位坐标', value: 'coordinates', needsWellName: true },
  { label: '井轨迹', value: 'trajectory', needsWellName: true },
  { label: '测井曲线', value: 'curves', needsWellName: true },
  { label: '分层', value: 'layers', needsWellName: false },
  { label: '岩性', value: 'lithology', needsWellName: false },
  { label: '解释结论', value: 'interpretation', needsWellName: false },
  { label: '离散曲线', value: 'discrete', needsWellName: true },
  { label: '时深关系', value: 'time_depth', needsWellName: false },
  { label: '井点属性', value: 'well_attribute', needsWellName: false }
]
