import type { ToolBarItem } from '@/types/toolbar'

export const toolbarConfig: ToolBarItem[] = [
  { id: 'tb-data-manage', label: '数据管理', icon: 'FolderOpened', tooltip: '数据管理' },
  { id: 'tb-basemap', label: '底图', icon: 'MapLocation', tooltip: '底图' },
  { id: 'tb-well-curve', label: '井曲线', icon: 'TrendCharts', tooltip: '井曲线' },
  { id: 'tb-synthetic', label: '合成记录', icon: 'DataLine', tooltip: '合成记录' },
  { id: 'tb-section', label: '剖面窗口', icon: 'PictureFilled', tooltip: '剖面窗口' },
  { id: 'tb-prestack', label: '叠前窗口', icon: 'Grid', tooltip: '叠前窗口' },
  { id: 'tb-histogram', label: '直方图', icon: 'Histogram', tooltip: '直方图' },
  { id: 'tb-crossplot', label: '交会图', icon: 'DataAnalysis', tooltip: '交会图' },
  { id: 'tb-3d-view', label: '三维窗口', icon: 'Box', tooltip: '三维窗口' },
  { id: 'tb-forward', label: '正演', icon: 'VideoPlay', tooltip: '正演' }
]
