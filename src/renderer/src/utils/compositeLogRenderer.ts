// ── Composite Well Log Canvas Renderer ──
// Professional composite log rendering with formation, depth, lithology,
// curve, discrete, and interpretation tracks.

import type {
  CompositeLogConfig,
  CurveStyle,
  GridConfig,
  TrackConfig,
} from '@/types/compositeLog'
import type {
  CurveDataPoint,
  InterpretationInfo,
  LayerInfo,
  LithologyInfo,
} from '@/types/well'
import { defaultGridConfig, INTERPRETATION_COLORS, matchLithology } from '@/types/compositeLog'
import { createLithologyPattern } from './lithologyPatterns'

// ── Layout constants ──
const HEADER_TITLE_H = 18 // title row
const HEADER_CURVE_H = 24 // per-curve row (text + legend)
const HEADER_PAD = 6
const MIN_HEADER_H = 44
const TRACK_GAP = 1
const DEPTH_TICK_MAJOR = 50
const DEPTH_TICK_MINOR = 10
const FONT = '11px "Microsoft YaHei", sans-serif'
const HEADER_FONT = 'bold 11px "Microsoft YaHei", sans-serif'
const SMALL_FONT = '9px "Microsoft YaHei", sans-serif'

export interface CompositeLogData {
  curveData: Record<string, CurveDataPoint[]>
  layers: LayerInfo[]
  lithology: LithologyInfo[]
  interpretations: InterpretationInfo[]
}

export interface RenderMetrics {
  headerHeight: number
  bodyTop: number
  bodyHeight: number
  totalWidth: number
  trackRects: Array<{ trackId: string, x: number, width: number }>
}

// Formation color palette
const FORMATION_COLORS = [
  '#E8F5E9',
  '#E3F2FD',
  '#FFF3E0',
  '#F3E5F5',
  '#FFFDE7',
  '#FCE4EC',
  '#E0F7FA',
  '#FBE9E7',
  '#F1F8E9',
  '#EDE7F6',
  '#FFF8E1',
  '#EFEBE9',
]

export class CompositeLogRenderer {
  private ctx: CanvasRenderingContext2D
  private config: CompositeLogConfig
  private data: CompositeLogData
  private dpr: number
  private canvasWidth: number
  private canvasHeight: number
  private metrics: RenderMetrics | null = null
  private _headerHeight = MIN_HEADER_H
  private _selectedTrackId: string | null = null

  constructor(
    canvas: HTMLCanvasElement,
    config: CompositeLogConfig,
    data: CompositeLogData,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.config = config
    this.data = data
    this.dpr = window.devicePixelRatio || 1
    this.canvasWidth = canvas.width / this.dpr
    this.canvasHeight = canvas.height / this.dpr
  }

  updateConfig(config: CompositeLogConfig) {
    this.config = config
  }

  updateData(data: CompositeLogData) {
    this.data = data
  }

  setSelectedTrack(trackId: string | null) {
    this._selectedTrackId = trackId
  }

  getMetrics(): RenderMetrics | null {
    return this.metrics
  }

  getHeaderHeight(): number {
    return this._headerHeight
  }

  // ── Dynamic header height ──

  private computeHeaderHeight(): number {
    const visibleTracks = this.config.tracks.filter(t => t.visible)
    let maxCurves = 0
    for (const track of visibleTracks) {
      if ((track.type === 'curve' || track.type === 'discrete') && track.curves?.length) {
        maxCurves = Math.max(maxCurves, track.curves.length)
      }
    }
    return Math.max(MIN_HEADER_H, HEADER_TITLE_H + maxCurves * HEADER_CURVE_H + HEADER_PAD * 2)
  }

  // ── Coordinate transforms ──

  depthToY(depth: number): number {
    const { min, max } = this.config.depthRange
    const bodyTop = this._headerHeight
    const bodyHeight = this.canvasHeight - this._headerHeight
    return bodyTop + ((depth - min) / (max - min)) * bodyHeight
  }

  yToDepth(y: number): number {
    const { min, max } = this.config.depthRange
    const bodyTop = this._headerHeight
    const bodyHeight = this.canvasHeight - this._headerHeight
    return min + ((y - bodyTop) / bodyHeight) * (max - min)
  }

  // ── Main render ──

  render() {
    const ctx = this.ctx
    ctx.save()
    ctx.scale(this.dpr, this.dpr)

    // clear
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    const visibleTracks = this.config.tracks.filter(t => t.visible)
    if (visibleTracks.length === 0) {
      ctx.fillStyle = '#999'
      ctx.font = '14px "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        '请选择井以显示综合柱状图',
        this.canvasWidth / 2,
        this.canvasHeight / 2,
      )
      ctx.restore()
      return
    }

    // compute dynamic header height
    this._headerHeight = this.computeHeaderHeight()
    const hh = this._headerHeight

    // compute track positions
    const trackRects: RenderMetrics['trackRects'] = []
    let x = 0
    for (const track of visibleTracks) {
      trackRects.push({ trackId: track.id, x, width: track.width })
      x += track.width + TRACK_GAP
    }

    this.metrics = {
      headerHeight: hh,
      bodyTop: hh,
      bodyHeight: this.canvasHeight - hh,
      totalWidth: x,
      trackRects,
    }

    // draw depth grid first (under everything)
    this.drawDepthGrid(trackRects)

    // draw each track body
    for (let i = 0; i < visibleTracks.length; i++) {
      const track = visibleTracks[i]
      const rect = trackRects[i]
      this.drawTrackBody(track, rect.x, hh, rect.width, this.canvasHeight - hh)
    }

    // draw selection highlight
    if (this._selectedTrackId) {
      for (let i = 0; i < visibleTracks.length; i++) {
        if (visibleTracks[i].id === this._selectedTrackId) {
          const rect = trackRects[i]
          ctx.strokeStyle = '#409eff'
          ctx.lineWidth = 2
          ctx.strokeRect(rect.x, 0, rect.width, this.canvasHeight)
        }
      }
    }

    // draw headers last (on top)
    for (let i = 0; i < visibleTracks.length; i++) {
      const track = visibleTracks[i]
      const rect = trackRects[i]
      this.drawTrackHeader(track, rect.x, rect.width, hh)
    }

    ctx.restore()
  }

  // ── Professional track header ──

  private drawTrackHeader(track: TrackConfig, x: number, w: number, hh: number) {
    const ctx = this.ctx
    const isSelected = track.id === this._selectedTrackId

    // background
    ctx.fillStyle = isSelected ? '#e8f0fe' : '#f5f5f5'
    ctx.fillRect(x, 0, w, hh)

    // border
    ctx.strokeStyle = isSelected ? '#409eff' : '#bbb'
    ctx.lineWidth = isSelected ? 1.5 : 0.5
    ctx.strokeRect(x, 0, w, hh)

    // title
    ctx.fillStyle = '#333'
    ctx.font = HEADER_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(track.title, x + w / 2, HEADER_PAD, w - 6)

    // for curve/discrete tracks: show each curve's name + range + legend line
    if ((track.type === 'curve' || track.type === 'discrete') && track.curves?.length) {
      let curveY = HEADER_TITLE_H + HEADER_PAD
      ctx.font = SMALL_FONT

      for (const cs of track.curves) {
        // Curve info text: "CurveName Min—Max Unit"
        const unitStr = cs.unit ? ` ${cs.unit}` : ''
        const rangeText = cs.logarithmic
          ? `${cs.curveName} ${cs.min}—${cs.max}${unitStr} log`
          : `${cs.curveName} ${cs.min}—${cs.max}${unitStr}`

        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(rangeText, x + w / 2, curveY, w - 8)
        curveY += 13

        // Color legend line (full width, actual color+style)
        ctx.strokeStyle = cs.color
        ctx.lineWidth = Math.max(cs.lineWidth, 1.5)
        if (cs.lineStyle === 'dashed')
          ctx.setLineDash([6, 3])
        else if (cs.lineStyle === 'dotted')
          ctx.setLineDash([2, 2])
        else ctx.setLineDash([])

        ctx.beginPath()
        ctx.moveTo(x + 4, curveY + 2)
        ctx.lineTo(x + w - 4, curveY + 2)
        ctx.stroke()
        ctx.setLineDash([])
        curveY += 10
      }
    }
  }

  // ── Track body dispatcher ──

  private drawTrackBody(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    // clip to track area
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()

    // track background
    ctx.fillStyle = track.bgColor || '#ffffff'
    ctx.fillRect(x, y, w, h)

    // border
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x, y, w, h)

    switch (track.type) {
      case 'formation':
        this.drawFormationTrack(x, y, w, h)
        break
      case 'depth':
        this.drawDepthTrack(x, y, w, h)
        break
      case 'lithology':
        this.drawLithologyTrack(x, y, w, h)
        break
      case 'curve':
        this.drawCurveTrack(track, x, y, w, h)
        break
      case 'discrete':
        this.drawDiscreteTrack(track, x, y, w, h)
        break
      case 'interpretation':
        this.drawInterpretationTrack(x, y, w, h)
        break
      case 'mineral':
        this.drawMineralTrack(track, x, y, w, h)
        break
      case 'text':
        this.drawTextTrack(track, x, y, w, h)
        break
    }

    ctx.restore()
  }

  // ── Formation track ──

  private drawFormationTrack(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const layers = this.data.layers
    if (!layers.length)
      return

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      const y1 = this.depthToY(layer.top_depth)
      const y2 = this.depthToY(layer.bottom_depth)
      if (y2 < y || y1 > y + h)
        continue

      const clampY1 = Math.max(y1, y)
      const clampY2 = Math.min(y2, y + h)

      // colored band
      ctx.fillStyle = FORMATION_COLORS[i % FORMATION_COLORS.length]
      ctx.fillRect(x, clampY1, w, clampY2 - clampY1)

      // top boundary line
      ctx.strokeStyle = '#888'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(x, clampY1)
      ctx.lineTo(x + w, clampY1)
      ctx.stroke()

      // formation name — vertical text for narrow tracks
      const segHeight = clampY2 - clampY1
      const midY = (clampY1 + clampY2) / 2

      if (segHeight > 14) {
        ctx.fillStyle = '#333'
        ctx.font = SMALL_FONT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const name = layer.formation
        if (w < 60 && name.length > 3) {
          // draw vertically for narrow column
          for (let ci = 0; ci < name.length; ci++) {
            const charY = midY - ((name.length - 1) * 11) / 2 + ci * 11
            if (charY > clampY1 + 2 && charY < clampY2 - 2) {
              ctx.fillText(name[ci], x + w / 2, charY)
            }
          }
        }
        else {
          ctx.fillText(name, x + w / 2, midY, w - 4)
        }
      }
    }

    // bottom boundary of last layer
    if (layers.length > 0) {
      const lastY = this.depthToY(layers[layers.length - 1].bottom_depth)
      if (lastY >= y && lastY <= y + h) {
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(x, lastY)
        ctx.lineTo(x + w, lastY)
        ctx.stroke()
      }
    }
  }

  // ── Depth track ──

  private drawDepthTrack(x: number, _y: number, w: number, _h?: number) {
    const ctx = this.ctx
    const { min, max } = this.config.depthRange

    // major ticks
    const startDepth = Math.ceil(min / DEPTH_TICK_MAJOR) * DEPTH_TICK_MAJOR
    for (let d = startDepth; d <= max; d += DEPTH_TICK_MAJOR) {
      const py = this.depthToY(d)

      // tick marks on both sides
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, py)
      ctx.lineTo(x + 6, py)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + w - 6, py)
      ctx.lineTo(x + w, py)
      ctx.stroke()

      // depth value
      ctx.fillStyle = '#333'
      ctx.font = FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(d.toFixed(0), x + w / 2, py)
    }

    // minor ticks
    const startMinor = Math.ceil(min / DEPTH_TICK_MINOR) * DEPTH_TICK_MINOR
    for (let d = startMinor; d <= max; d += DEPTH_TICK_MINOR) {
      if (d % DEPTH_TICK_MAJOR === 0)
        continue
      const py = this.depthToY(d)

      ctx.strokeStyle = '#aaa'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, py)
      ctx.lineTo(x + 3, py)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + w - 3, py)
      ctx.lineTo(x + w, py)
      ctx.stroke()
    }
  }

  // ── Lithology track ──

  private drawLithologyTrack(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const lithoData = this.data.lithology
    if (!lithoData.length)
      return

    for (const litho of lithoData) {
      const y1 = this.depthToY(litho.top_depth)
      const y2 = this.depthToY(litho.bottom_depth)
      if (y2 < y || y1 > y + h)
        continue

      const clampY1 = Math.max(y1, y)
      const clampY2 = Math.min(y2, y + h)

      // keyword-based pattern matching
      const def = matchLithology(litho.description)
      if (def) {
        const pattern = createLithologyPattern(ctx, def.patternType, def.color)
        ctx.fillStyle = pattern
      }
      else {
        ctx.fillStyle = '#E0E0E0'
      }
      ctx.fillRect(x, clampY1, w, clampY2 - clampY1)

      // boundary line
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 0.3
      ctx.beginPath()
      ctx.moveTo(x, clampY1)
      ctx.lineTo(x + w, clampY1)
      ctx.stroke()
    }
  }

  // ── Curve track (continuous) ──

  private drawCurveTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    if (!track.curves?.length)
      return

    this.drawVerticalGrid(x, y, w, h)

    for (const cs of track.curves) {
      this.drawSingleCurve(cs, x, y, w, h)
    }
  }

  private drawSingleCurve(cs: CurveStyle, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const points = this.data.curveData[cs.curveName]
    if (!points?.length)
      return

    const { min: vMin, max: vMax } = cs
    const range = vMax - vMin
    if (range <= 0)
      return

    const valueToX = (v: number): number => {
      if (cs.logarithmic && vMin > 0) {
        const logMin = Math.log10(vMin)
        const logMax = Math.log10(vMax)
        const logV = Math.log10(Math.max(v, vMin))
        return x + ((logV - logMin) / (logMax - logMin)) * w
      }
      return x + ((v - vMin) / range) * w
    }

    // filter valid points — skip null and -9999 sentinel values
    const validPoints: Array<{ px: number, py: number }> = []
    for (const pt of points) {
      if (pt.value === null || pt.value === -9999)
        continue
      const py = this.depthToY(pt.depth)
      if (py < y - 2 || py > y + h + 2)
        continue
      const px = valueToX(pt.value)
      validPoints.push({ px: Math.max(x, Math.min(x + w, px)), py })
    }
    if (validPoints.length < 2)
      return

    // fill area if configured
    if (cs.fill) {
      ctx.fillStyle = cs.fill.color
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      const baseX = cs.fill.direction === 'left' ? x : x + w
      ctx.moveTo(baseX, validPoints[0].py)
      for (const p of validPoints) {
        ctx.lineTo(p.px, p.py)
      }
      ctx.lineTo(baseX, validPoints[validPoints.length - 1].py)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // stroke curve
    ctx.strokeStyle = cs.color
    ctx.lineWidth = cs.lineWidth

    if (cs.lineStyle === 'dashed') {
      ctx.setLineDash([6, 3])
    }
    else if (cs.lineStyle === 'dotted') {
      ctx.setLineDash([2, 2])
    }
    else {
      ctx.setLineDash([])
    }

    const drawMode = cs.drawMode || 'line'
    if (drawMode === 'bar') {
      // bar mode: horizontal line from left edge to value for each point
      ctx.beginPath()
      for (const p of validPoints) {
        ctx.moveTo(x, p.py)
        ctx.lineTo(p.px, p.py)
      }
      ctx.stroke()
    }
    else {
      // line mode: connected polyline
      ctx.beginPath()
      ctx.moveTo(validPoints[0].px, validPoints[0].py)
      for (let i = 1; i < validPoints.length; i++) {
        ctx.lineTo(validPoints[i].px, validPoints[i].py)
      }
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  // ── Discrete track (staircase style) ──

  private drawDiscreteTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    if (!track.curves?.length)
      return

    this.drawVerticalGrid(x, y, w, h)

    for (const cs of track.curves) {
      const points = this.data.curveData[cs.curveName]
      if (!points?.length)
        continue

      const { min: vMin, max: vMax } = cs
      const range = vMax - vMin
      if (range <= 0)
        continue

      ctx.strokeStyle = cs.color
      ctx.lineWidth = cs.lineWidth
      ctx.setLineDash([])

      const drawMode = cs.drawMode || 'line'

      if (drawMode === 'bar') {
        ctx.beginPath()
        for (const pt of points) {
          if (pt.value === null || pt.value === -9999)
            continue
          const py = this.depthToY(pt.depth)
          if (py < y - 2 || py > y + h + 2)
            continue
          const px = Math.max(x, Math.min(x + w, x + ((pt.value - vMin) / range) * w))
          ctx.moveTo(x, py)
          ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
      else {
        let lastPx: number | null = null
        let lastPy: number | null = null

        ctx.beginPath()
        for (const pt of points) {
          if (pt.value === null || pt.value === -9999)
            continue
          const py = this.depthToY(pt.depth)
          if (py < y - 2 || py > y + h + 2)
            continue
          const px = Math.max(x, Math.min(x + w, x + ((pt.value - vMin) / range) * w))

          if (lastPx !== null && lastPy !== null) {
            ctx.lineTo(lastPx, py)
            ctx.lineTo(px, py)
          }
          else {
            ctx.moveTo(px, py)
          }
          lastPx = px
          lastPy = py
        }
        ctx.stroke()
      }
    }
  }

  // ── Interpretation track ──

  private drawInterpretationTrack(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const interps = this.data.interpretations
    if (!interps.length)
      return

    for (const interp of interps) {
      const y1 = this.depthToY(interp.top_depth)
      const y2 = this.depthToY(interp.bottom_depth)
      if (y2 < y || y1 > y + h)
        continue

      const clampY1 = Math.max(y1, y)
      const clampY2 = Math.min(y2, y + h)

      const colorKey = interp.conclusion || interp.category
      const fillColor = INTERPRETATION_COLORS[colorKey] || '#D3D3D3'

      ctx.fillStyle = fillColor
      ctx.globalAlpha = 0.5
      ctx.fillRect(x + 1, clampY1, w - 2, clampY2 - clampY1)
      ctx.globalAlpha = 1

      ctx.fillStyle = fillColor
      ctx.fillRect(x, clampY1, 4, clampY2 - clampY1)

      ctx.strokeStyle = '#999'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, clampY1)
      ctx.lineTo(x + w, clampY1)
      ctx.stroke()

      const segHeight = clampY2 - clampY1
      if (segHeight > 12) {
        ctx.fillStyle = '#333'
        ctx.font = SMALL_FONT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(colorKey, x + w / 2, (clampY1 + clampY2) / 2, w - 8)
      }
    }
  }

  // ── Mineral (stacked percentage bar) track ──

  private drawMineralTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const minerals = track.mineralCurves
    if (!minerals?.length) {
      ctx.fillStyle = '#999'
      ctx.font = SMALL_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('请配置矿物曲线', x + w / 2, y + h / 2)
      return
    }

    const firstCurve = this.data.curveData[minerals[0].curveName]
    if (!firstCurve?.length)
      return

    for (let i = 0; i < firstCurve.length; i++) {
      const depth = firstCurve[i].depth
      const py = this.depthToY(depth)
      if (py < y - 1 || py > y + h + 1)
        continue

      const nextDepth = i + 1 < firstCurve.length ? firstCurve[i + 1].depth : depth + 0.5
      const py2 = this.depthToY(nextDepth)
      const barH = Math.max(py2 - py, 0.5)

      let total = 0
      const vals: Array<{ val: number, color: string }> = []
      for (const mc of minerals) {
        const pts = this.data.curveData[mc.curveName]
        if (!pts)
          continue
        const pt = pts[i] || pts.find(p => Math.abs(p.depth - depth) < 0.5)
        const v = pt?.value != null && pt.value !== -9999 ? Math.max(0, pt.value) : 0
        vals.push({ val: v, color: mc.color })
        total += v
      }
      if (total <= 0)
        continue

      let bx = x
      for (const { val, color } of vals) {
        const bw = (val / total) * w
        if (bw < 0.3) {
          bx += bw
          continue
        }
        ctx.fillStyle = color
        ctx.fillRect(bx, py, bw, barH)
        bx += bw
      }
    }

    const { min: dMin, max: dMax } = this.config.depthRange
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 0.3
    const startD = Math.ceil(dMin / 50) * 50
    for (let d = startD; d <= dMax; d += 50) {
      const ly = this.depthToY(d)
      if (ly >= y && ly <= y + h) {
        ctx.beginPath()
        ctx.moveTo(x, ly)
        ctx.lineTo(x + w, ly)
        ctx.stroke()
      }
    }
  }

  // ── Text track ──

  private drawTextTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const segments = track.textContent
    if (!segments?.length) {
      ctx.fillStyle = '#999'
      ctx.font = SMALL_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('请配置文本段', x + w / 2, y + h / 2)
      return
    }

    ctx.font = SMALL_FONT
    const padding = 3

    for (const seg of segments) {
      const y1 = this.depthToY(seg.topDepth)
      const y2 = this.depthToY(seg.bottomDepth)
      if (y2 < y || y1 > y + h)
        continue

      const clampY1 = Math.max(y1, y)
      const clampY2 = Math.min(y2, y + h)

      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, clampY1)
      ctx.lineTo(x + w, clampY1)
      ctx.stroke()

      ctx.fillStyle = seg.color || '#333'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const maxW = w - padding * 2
      const lineH = 12
      const text = seg.text
      let drawY = clampY1 + padding

      let line = ''
      for (let i = 0; i < text.length; i++) {
        const testLine = line + text[i]
        const tw = ctx.measureText(testLine).width
        if (tw > maxW && line.length > 0) {
          if (drawY + lineH <= clampY2) {
            ctx.fillText(line, x + padding, drawY)
          }
          drawY += lineH
          line = text[i]
        }
        else {
          line = testLine
        }
      }
      if (line && drawY + lineH <= clampY2 + 4) {
        ctx.fillText(line, x + padding, drawY)
      }
    }
  }

  // ── Configurable vertical grid (for curve/discrete tracks) ──

  private drawVerticalGrid(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const grid = this.getGridConfig()
    if (!grid.enabled)
      return

    if (grid.majorInterval >= 2) {
      ctx.strokeStyle = grid.majorColor
      ctx.lineWidth = grid.majorWidth
      for (let i = 1; i < grid.majorInterval; i++) {
        const lx = x + (w * i) / grid.majorInterval
        ctx.beginPath()
        ctx.moveTo(lx, y)
        ctx.lineTo(lx, y + h)
        ctx.stroke()
      }
    }

    if (grid.minorInterval > 0 && grid.majorInterval >= 2) {
      ctx.strokeStyle = grid.minorColor
      ctx.lineWidth = grid.minorWidth
      for (let i = 0; i < grid.majorInterval; i++) {
        const segStart = x + (w * i) / grid.majorInterval
        const segW = w / grid.majorInterval
        for (let j = 1; j < grid.minorInterval; j++) {
          const lx = segStart + (segW * j) / grid.minorInterval
          ctx.beginPath()
          ctx.moveTo(lx, y)
          ctx.lineTo(lx, y + h)
          ctx.stroke()
        }
      }
    }
  }

  private getGridConfig(): GridConfig {
    return this.config.grid || defaultGridConfig()
  }

  // ── Depth grid (horizontal lines across all tracks) ──

  private drawDepthGrid(trackRects: RenderMetrics['trackRects']) {
    if (!trackRects.length)
      return
    const ctx = this.ctx
    const { min, max } = this.config.depthRange
    const totalX = trackRects[0].x
    const lastRect = trackRects[trackRects.length - 1]
    const totalW = lastRect.x + lastRect.width - totalX
    const grid = this.getGridConfig()

    ctx.strokeStyle = grid.enabled ? grid.majorColor : '#eaeaea'
    ctx.lineWidth = grid.enabled ? grid.majorWidth : 0.3
    const startDepth = Math.ceil(min / DEPTH_TICK_MAJOR) * DEPTH_TICK_MAJOR
    for (let d = startDepth; d <= max; d += DEPTH_TICK_MAJOR) {
      const py = this.depthToY(d)
      ctx.beginPath()
      ctx.moveTo(totalX, py)
      ctx.lineTo(totalX + totalW, py)
      ctx.stroke()
    }

    ctx.strokeStyle = grid.enabled ? grid.minorColor : '#f5f5f5'
    ctx.lineWidth = grid.enabled ? grid.minorWidth : 0.2
    const startMinor = Math.ceil(min / DEPTH_TICK_MINOR) * DEPTH_TICK_MINOR
    for (let d = startMinor; d <= max; d += DEPTH_TICK_MINOR) {
      if (d % DEPTH_TICK_MAJOR === 0)
        continue
      const py = this.depthToY(d)
      ctx.beginPath()
      ctx.moveTo(totalX, py)
      ctx.lineTo(totalX + totalW, py)
      ctx.stroke()
    }
  }

  // ── Crosshair overlay ──

  drawCrosshair(mouseX: number, mouseY: number) {
    const ctx = this.ctx
    const hh = this._headerHeight
    ctx.save()
    ctx.scale(this.dpr, this.dpr)

    if (mouseY < hh || mouseY > this.canvasHeight) {
      ctx.restore()
      return
    }

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.lineWidth = 0.8
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(0, mouseY)
    ctx.lineTo(this.canvasWidth, mouseY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(mouseX, hh)
    ctx.lineTo(mouseX, this.canvasHeight)
    ctx.stroke()
    ctx.setLineDash([])

    const depth = this.yToDepth(mouseY)
    const label = `${depth.toFixed(1)} m`
    ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
    const textWidth = ctx.measureText(label).width

    const lx = mouseX + 8
    const ly = mouseY - 16
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.beginPath()
    ctx.roundRect(lx - 2, ly - 2, textWidth + 8, 16, 3)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(label, lx + 2, ly)

    ctx.restore()
  }

  // ── Find track at x position ──

  findTrackAtX(mouseX: number): TrackConfig | null {
    if (!this.metrics)
      return null
    for (const rect of this.metrics.trackRects) {
      if (mouseX >= rect.x && mouseX < rect.x + rect.width) {
        return this.config.tracks.find(t => t.id === rect.trackId) || null
      }
    }
    return null
  }
}
