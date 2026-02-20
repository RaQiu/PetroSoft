import type { MenuGroup } from '@/types/menu'

export const menuConfig: MenuGroup[] = [
  {
    id: 'file',
    label: '文件(F)',
    children: [
      { id: 'file.new-workarea', label: '新建工区' },
      { id: 'file.open-workarea', label: '打开工区' },
      { id: 'file.save-workarea', label: '保存工区' },
      { id: 'file.backup-data', label: '备份核心数据' },
      { id: 'file.close-workarea', label: '关闭工区' },
      { id: 'file.divider1', label: '', divider: true },
      { id: 'file.open-tag', label: '打开标签' },
      { id: 'file.save-tag', label: '保存标签' },
      { id: 'file.divider2', label: '', divider: true },
      { id: 'file.clear-cache', label: '清除工区缓存' },
      { id: 'file.segy-browse', label: 'Segy文件浏览' },
      { id: 'file.segy-merge', label: 'Segy文件合并' },
      { id: 'file.divider3', label: '', divider: true },
      {
        id: 'file.recent',
        label: '最近使用的工区',
        children: [
          { id: 'file.recent.empty', label: '(无)', disabled: true }
        ]
      },
      { id: 'file.divider4', label: '', divider: true },
      { id: 'file.exit', label: '退出' }
    ]
  },
  {
    id: 'data',
    label: '数据(D)',
    children: [
      {
        id: 'data.well-position',
        label: '井位',
        children: [
          { id: 'data.well-position.import', label: '导入' },
          { id: 'data.well-position.export', label: '导出' }
        ]
      },
      {
        id: 'data.well-deviation',
        label: '井斜',
        children: [
          { id: 'data.well-deviation.import', label: '导入' },
          { id: 'data.well-deviation.export', label: '导出' }
        ]
      },
      {
        id: 'data.curve',
        label: '曲线',
        children: [
          { id: 'data.curve.import', label: '导入' },
          { id: 'data.curve.export', label: '导出' }
        ]
      },
      {
        id: 'data.layer',
        label: '分层',
        children: [
          { id: 'data.layer.import', label: '导入' },
          { id: 'data.layer.export', label: '导出' }
        ]
      },
      {
        id: 'data.time-depth',
        label: '时深',
        children: [
          { id: 'data.time-depth.import', label: '导入' },
          { id: 'data.time-depth.export', label: '导出' }
        ]
      },
      {
        id: 'data.interpretation',
        label: '解释结论',
        children: [
          { id: 'data.interpretation.import', label: '导入' },
          { id: 'data.interpretation.export', label: '导出' }
        ]
      },
      {
        id: 'data.mud-log',
        label: '录井',
        children: [
          { id: 'data.mud-log.import', label: '导入' },
          { id: 'data.mud-log.export', label: '导出' }
        ]
      },
      {
        id: 'data.well-attribute',
        label: '井点属性',
        children: [
          { id: 'data.well-attribute.import', label: '导入' },
          { id: 'data.well-attribute.export', label: '导出' }
        ]
      },
      { id: 'data.divider1', label: '', divider: true },
      {
        id: 'data.post-seismic',
        label: '叠后地震',
        children: [
          { id: 'data.post-seismic.import', label: '导入' },
          { id: 'data.post-seismic.export', label: '导出' }
        ]
      },
      {
        id: 'data.horizon',
        label: '层位',
        children: [
          { id: 'data.horizon.import', label: '导入' },
          { id: 'data.horizon.export', label: '导出' }
        ]
      },
      {
        id: 'data.fault-stick',
        label: '断层棒',
        children: [
          { id: 'data.fault-stick.import', label: '导入' },
          { id: 'data.fault-stick.export', label: '导出' }
        ]
      },
      {
        id: 'data.fault-polygon',
        label: '断层多边形',
        children: [
          { id: 'data.fault-polygon.import', label: '导入' },
          { id: 'data.fault-polygon.export', label: '导出' }
        ]
      },
      {
        id: 'data.polygon',
        label: '普通多边形',
        children: [
          { id: 'data.polygon.import', label: '导入' },
          { id: 'data.polygon.export', label: '导出' }
        ]
      },
      { id: 'data.divider2', label: '', divider: true },
      {
        id: 'data.pre-seismic',
        label: '叠前地震',
        children: [
          { id: 'data.pre-seismic.import', label: '导入' },
          { id: 'data.pre-seismic.export', label: '导出' }
        ]
      },
      {
        id: 'data.velocity',
        label: '速度体',
        children: [
          { id: 'data.velocity.import', label: '导入' },
          { id: 'data.velocity.export', label: '导出' }
        ]
      },
      {
        id: 'data.velocity-spectrum',
        label: '速度谱',
        children: [
          { id: 'data.velocity-spectrum.import', label: '导入' },
          { id: 'data.velocity-spectrum.export', label: '导出' }
        ]
      },
      {
        id: 'data.contour',
        label: '等值线图',
        children: [
          { id: 'data.contour.import', label: '导入' },
          { id: 'data.contour.export', label: '导出' }
        ]
      },
      { id: 'data.divider3', label: '', divider: true },
      {
        id: 'data.query',
        label: '查询',
        children: [
          { id: 'data.query.well', label: '查询井数据' },
          { id: 'data.query.seismic', label: '查询地震数据' }
        ]
      },
      { id: 'data.data-manage', label: '数据管理' }
    ]
  },
  {
    id: 'well',
    label: '井(L)',
    children: [
      { id: 'well.manage', label: '井管理' },
      {
        id: 'well.new-group',
        label: '新建井组',
        children: [
          { id: 'well.new-group.by-area', label: '按区域' },
          { id: 'well.new-group.by-type', label: '按类型' }
        ]
      },
      { id: 'well.curve-edit', label: '曲线编辑' },
      { id: 'well.outlier', label: '异常值处理' },
      { id: 'well.resample', label: '曲线重采样' },
      { id: 'well.baseline', label: '基线校正' },
      {
        id: 'well.standardize',
        label: '标准化',
        children: [
          { id: 'well.standardize.zscore', label: 'Z-Score标准化' },
          { id: 'well.standardize.minmax', label: 'Min-Max标准化' }
        ]
      },
      { id: 'well.normalize', label: '归一化' },
      {
        id: 'well.extract-attribute',
        label: '提取井点属性',
        children: [
          { id: 'well.extract-attribute.single', label: '单井提取' },
          { id: 'well.extract-attribute.batch', label: '批量提取' }
        ]
      },
      { id: 'well.filter', label: '曲线滤波' },
      { id: 'well.calculator', label: '曲线计算器' },
      { id: 'well.calc-impedance', label: '计算纵波阻抗' }
    ]
  },
  {
    id: 'rock-physics',
    label: '岩石物理(Y)',
    children: [
      { id: 'rock-physics.analysis', label: '岩石物理分析' },
      { id: 'rock-physics.fluid-replace', label: '流体替换' },
      { id: 'rock-physics.avo-forward', label: 'AVO正演模拟' }
    ]
  },
  {
    id: 'seismic',
    label: '地震(I)',
    children: [
      { id: 'seismic.display', label: '地震显示' },
      { id: 'seismic.process', label: '地震处理' },
      { id: 'seismic.attribute', label: '地震属性' }
    ]
  },
  {
    id: 'velocity',
    label: '速度(V)',
    children: [
      { id: 'velocity.analysis', label: '速度分析' },
      { id: 'velocity.modeling', label: '速度建模' },
      { id: 'velocity.conversion', label: '速度转换' }
    ]
  },
  {
    id: 'smart-interp',
    label: '智能解释(T)',
    children: [
      { id: 'smart-interp.horizon-track', label: '层位追踪' },
      { id: 'smart-interp.fault-detect', label: '断层识别' },
      { id: 'smart-interp.auto-pick', label: '自动拾取' }
    ]
  },
  {
    id: 'model',
    label: '模型(M)',
    children: [
      { id: 'model.structure', label: '构造模型' },
      { id: 'model.property', label: '属性模型' },
      { id: 'model.stratigraphic', label: '地层模型' }
    ]
  },
  {
    id: 'post-inversion',
    label: '叠后反演(O)',
    children: [
      { id: 'post-inversion.impedance', label: '波阻抗反演' },
      { id: 'post-inversion.sparse', label: '稀疏脉冲反演' },
      { id: 'post-inversion.colored', label: '有色反演' }
    ]
  },
  {
    id: 'pre-inversion',
    label: '叠前反演(P)',
    children: [
      { id: 'pre-inversion.simultaneous', label: '同时反演' },
      { id: 'pre-inversion.avo', label: 'AVO反演' },
      { id: 'pre-inversion.elastic', label: '弹性阻抗反演' }
    ]
  },
  {
    id: 'depth-inversion',
    label: '深度域反演(R)',
    children: [
      { id: 'depth-inversion.conversion', label: '深度转换' },
      { id: 'depth-inversion.inversion', label: '深度域反演' }
    ]
  },
  {
    id: 'fracture',
    label: '断裂成像(G)',
    children: [
      { id: 'fracture.imaging', label: '裂缝成像' },
      { id: 'fracture.detection', label: '裂缝检测' }
    ]
  },
  {
    id: 'application',
    label: '应用(A)',
    children: [
      { id: 'application.reservoir', label: '储层预测' },
      { id: 'application.sweet-spot', label: '甜点分析' }
    ]
  },
  {
    id: 'window',
    label: '窗口(W)',
    children: [
      { id: 'window.cascade', label: '层叠窗口' },
      { id: 'window.tile-horizontal', label: '水平平铺' },
      { id: 'window.tile-vertical', label: '垂直平铺' },
      { id: 'window.close-all', label: '关闭所有窗口' }
    ]
  },
  {
    id: 'help',
    label: '帮助(H)',
    children: [
      { id: 'help.manual', label: '用户手册' },
      { id: 'help.about', label: '关于 PetroSoft' }
    ]
  }
]
