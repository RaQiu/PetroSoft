export interface ChildWindowDef {
  windowId: string
  title: string
  visibilityKey: string
  component: () => Promise<any>
  defaultSize: { width: number; height: number }
}

export const CHILD_WINDOWS: Record<string, ChildWindowDef> = {
  compositeLog: {
    windowId: 'compositeLog',
    title: '综合柱状图',
    visibilityKey: 'compositeLogVisible',
    component: () => import('@/components/dialogs/CompositeLogWindow.vue'),
    defaultSize: { width: 1100, height: 800 }
  },
  seismicDisplay: {
    windowId: 'seismicDisplay',
    title: '地震剖面',
    visibilityKey: 'seismicDisplayVisible',
    component: () => import('@/components/dialogs/SeismicDisplayDialog.vue'),
    defaultSize: { width: 1100, height: 800 }
  },
  histogram: {
    windowId: 'histogram',
    title: '直方图',
    visibilityKey: 'histogramVisible',
    component: () => import('@/components/dialogs/HistogramDialog.vue'),
    defaultSize: { width: 900, height: 700 }
  },
  crossplot: {
    windowId: 'crossplot',
    title: '交会图',
    visibilityKey: 'crossplotVisible',
    component: () => import('@/components/dialogs/CrossplotDialog.vue'),
    defaultSize: { width: 900, height: 700 }
  },
  basemap: {
    windowId: 'basemap',
    title: '底图',
    visibilityKey: 'basemapVisible',
    component: () => import('@/components/dialogs/BasemapDialog.vue'),
    defaultSize: { width: 1000, height: 800 }
  },
  dataManage: {
    windowId: 'dataManage',
    title: '数据管理',
    visibilityKey: 'dataManageVisible',
    component: () => import('@/components/dialogs/DataManageDialog.vue'),
    defaultSize: { width: 1000, height: 700 }
  },
  wellList: {
    windowId: 'wellList',
    title: '井管理',
    visibilityKey: 'wellListVisible',
    component: () => import('@/components/dialogs/WellListDialog.vue'),
    defaultSize: { width: 900, height: 600 }
  },
  segyBrowse: {
    windowId: 'segyBrowse',
    title: 'SEG-Y 浏览',
    visibilityKey: 'segyBrowseVisible',
    component: () => import('@/components/dialogs/SegyBrowseDialog.vue'),
    defaultSize: { width: 1000, height: 700 }
  },
  wellDataQuery: {
    windowId: 'wellDataQuery',
    title: '井数据查询',
    visibilityKey: 'wellDataQueryVisible',
    component: () => import('@/components/dialogs/WellDataQueryDialog.vue'),
    defaultSize: { width: 900, height: 700 }
  }
}
