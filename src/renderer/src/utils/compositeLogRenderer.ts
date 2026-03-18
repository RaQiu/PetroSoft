// ── Composite Well Log Canvas Renderer ──
// Professional composite log rendering with formation, depth, lithology,
// curve, discrete, and interpretation tracks.

import type {
  CompositeLogConfig,
  CurveStyle,
  FractureImageConfig,
  GridConfig,
  TrackConfig,
} from '@/types/compositeLog'
import type {
  CurveDataPoint,
  InterpretationInfo,
  LayerInfo,
  LithologyInfo,
} from '@/types/well'
import { defaultGridConfig, DEFAULT_CURVE_COLOR_RAMP as FALLBACK_CURVE_COLOR_RAMP, INTERPRETATION_COLORS, normalizeCurveStyle } from '@/types/compositeLog'
import { emitCompositeLogDebug } from './compositeLogDebug'
import { createLithologyPattern, getLithologyBgColor, matchLithologyId } from './lithologyPatterns'

// ── Layout constants ──
const HEADER_CURVE_H = 30 // per-curve cell: line1 name(unit) + line2 min—legend—max
const HEADER_PAD = 2
const MIN_HEADER_H = 30
const TRACK_GAP = 1
const DEPTH_TICK_MAJOR = 50
const DEPTH_TICK_MINOR = 10
const FONT = '11px "Microsoft YaHei", sans-serif'
const HEADER_FONT = 'bold 11px "Microsoft YaHei", sans-serif'
const SMALL_FONT = '9px "Microsoft YaHei", sans-serif'
const GRID_DEBUG_PREFIX = '[CompositeLog][grid]'
const FRACTURE_HANDLE_SIZE = 8

export type FractureImageHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

export interface FractureImageSelection {
  trackId: string
  imageId: string
}

export interface LithologySelection {
  trackId: string
  lithologyId: number
}

export interface FractureImageHitTarget extends FractureImageSelection {
  handle: FractureImageHandle
}

export interface FractureImageRenderRect extends FractureImageSelection {
  left: number
  top: number
  right: number
  bottom: number
}

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

export interface HoverCurveInfo {
  curveName: string
  depth: number
  value: number
  px: number
  py: number
}

export interface SelectionRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SelectedCurvePoint {
  trackId: string
  curveName: string
  depth: number
  value: number
  px: number
  py: number
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
  private _selectionRect: SelectionRect | null = null
  private _selectedCurvePoints: SelectedCurvePoint[] = []
  private _gridDebugState = new Map<string, string>()
  private _selectedFractureImage: FractureImageSelection | null = null
  private _selectedLithology: LithologySelection | null = null
  private _fractureImageRects: FractureImageRenderRect[] = []
  private _imageCache = new Map<string, HTMLImageElement | null>()

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

  setSelectionRect(rect: SelectionRect | null) {
    this._selectionRect = rect
  }

  setSelectedCurvePoints(points: SelectedCurvePoint[]) {
    this._selectedCurvePoints = points
  }

  setSelectedFractureImage(selection: FractureImageSelection | null) {
    this._selectedFractureImage = selection
  }

  setSelectedLithology(selection: LithologySelection | null) {
    this._selectedLithology = selection
  }

  getMetrics(): RenderMetrics | null {
    return this.metrics
  }

  getHeaderHeight(): number {
    return this._headerHeight
  }

  getTrackBodyRect(trackId: string): { x: number, y: number, width: number, height: number } | null {
    const rect = this.metrics?.trackRects.find(item => item.trackId === trackId)
    if (!rect) {
      return null
    }
    return {
      x: rect.x,
      y: this._headerHeight,
      width: rect.width,
      height: this.canvasHeight - this._headerHeight,
    }
  }

  private debugGrid(track: TrackConfig, phase: string, payload: Record<string, unknown>) {
    const debugPayload = {
      trackId: track.id,
      trackTitle: track.title,
      phase,
      ...payload,
    }
    const serialized = JSON.stringify(debugPayload)
    if (this._gridDebugState.get(track.id) === serialized) {
      return
    }
    this._gridDebugState.set(track.id, serialized)
    emitCompositeLogDebug({ channel: 'grid', event: phase, payload: { prefix: GRID_DEBUG_PREFIX, ...debugPayload } })
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
    // no title row — only curve cells; non-curve tracks get at least 1 cell height
    const cells = Math.max(1, maxCurves)
    return Math.max(MIN_HEADER_H, cells * HEADER_CURVE_H + HEADER_PAD)
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

  private getValueToX(cs: CurveStyle, x: number, w: number): ((value: number) => number) | null {
    const normalizedCurve = normalizeCurveStyle(cs)
    const { min: vMin, max: vMax } = normalizedCurve
    const range = vMax - vMin
    if (range <= 0) {
      return null
    }
    if (normalizedCurve.logarithmic && vMin > 0 && vMax > 0) {
      const logMin = Math.log10(vMin)
      const logMax = Math.log10(vMax)
      if (logMax <= logMin) {
        return null
      }
      return (value: number) => {
        const safeValue = Math.max(vMin, value)
        const logValue = Math.log10(safeValue)
        return x + ((logValue - logMin) / (logMax - logMin)) * w
      }
    }
    return (value: number) => x + ((value - vMin) / range) * w
  }

  private getCurveRenderPoints(cs: CurveStyle, x: number, y: number, w: number, h: number): Array<{ depth: number, value: number, px: number, py: number }> {
    const points = this.data.curveData[cs.curveName]
    if (!points?.length) {
      return []
    }
    const valueToX = this.getValueToX(cs, x, w)
    if (!valueToX) {
      return []
    }

    const validPoints: Array<{ depth: number, value: number, px: number, py: number }> = []
    for (const pt of points) {
      if (pt.value === null || pt.value === -9999) {
        continue
      }
      const py = this.depthToY(pt.depth)
      if (py < y - 2 || py > y + h + 2) {
        continue
      }
      const px = valueToX(pt.value)
      validPoints.push({
        depth: pt.depth,
        value: pt.value,
        px: Math.max(x, Math.min(x + w, px)),
        py,
      })
    }
    return validPoints
  }

  private getCurveColor(cs: CurveStyle, value: number): string {
    if (cs.valueColoring === false) {
      return cs.color
    }
    const ramp = cs.colorRamp || FALLBACK_CURVE_COLOR_RAMP
    const { min: vMin, max: vMax } = cs
    if (vMax <= vMin) {
      return cs.color
    }
    const ratio = Math.max(0, Math.min(1, (value - vMin) / (vMax - vMin)))
    if (ratio <= 0.5) {
      return this.interpolateColor(ramp.low, ramp.mid, ratio / 0.5)
    }
    return this.interpolateColor(ramp.mid, ramp.high, (ratio - 0.5) / 0.5)
  }

  private interpolateColor(from: string, to: string, ratio: number): string {
    const clampRatio = Math.max(0, Math.min(1, ratio))
    const [r1, g1, b1] = this.hexToRgb(from)
    const [r2, g2, b2] = this.hexToRgb(to)
    const r = Math.round(r1 + (r2 - r1) * clampRatio)
    const g = Math.round(g1 + (g2 - g1) * clampRatio)
    const b = Math.round(b1 + (b2 - b1) * clampRatio)
    return `rgb(${r}, ${g}, ${b})`
  }

  private hexToRgb(color: string): [number, number, number] {
    const normalized = color.replace('#', '').trim()
    if (normalized.length === 3) {
      return [
        Number.parseInt(normalized[0] + normalized[0], 16),
        Number.parseInt(normalized[1] + normalized[1], 16),
        Number.parseInt(normalized[2] + normalized[2], 16),
      ]
    }
    if (normalized.length >= 6) {
      return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
      ]
    }
    return [0, 0, 0]
  }

  private getOrCreateImage(src: string): HTMLImageElement | null {
    if (this._imageCache.has(src)) {
      return this._imageCache.get(src) || null
    }
    const image = new Image()
    this._imageCache.set(src, image)
    image.onload = () => {
      window.requestAnimationFrame(() => this.render())
    }
    image.onerror = () => {
      this._imageCache.set(src, null)
      window.requestAnimationFrame(() => this.render())
    }
    image.src = src
    return image
  }

  private getFractureImageRect(
    trackId: string,
    image: FractureImageConfig,
  ): FractureImageRenderRect | null {
    const trackRect = this.getTrackBodyRect(trackId)
    if (!trackRect) {
      return null
    }
    const left = trackRect.x + image.leftRatio * trackRect.width
    const right = trackRect.x + image.rightRatio * trackRect.width
    const top = this.depthToY(image.topDepth)
    const bottom = this.depthToY(image.bottomDepth)
    return {
      trackId,
      imageId: image.id,
      left,
      top,
      right,
      bottom,
    }
  }

  private drawFractureSelection(rect: FractureImageRenderRect) {
    const ctx = this.ctx
    const width = rect.right - rect.left
    const height = rect.bottom - rect.top
    ctx.save()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.strokeRect(rect.left, rect.top, width, height)
    ctx.setLineDash([])
    const handles = [
      [rect.left, rect.top],
      [rect.right, rect.top],
      [rect.left, rect.bottom],
      [rect.right, rect.bottom],
    ]
    for (const [x, y] of handles) {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 1.2
      ctx.fillRect(x - FRACTURE_HANDLE_SIZE / 2, y - FRACTURE_HANDLE_SIZE / 2, FRACTURE_HANDLE_SIZE, FRACTURE_HANDLE_SIZE)
      ctx.strokeRect(x - FRACTURE_HANDLE_SIZE / 2, y - FRACTURE_HANDLE_SIZE / 2, FRACTURE_HANDLE_SIZE, FRACTURE_HANDLE_SIZE)
    }
    ctx.restore()
  }

  private drawSelectedCurvePoints() {
    if (!this._selectedCurvePoints.length) {
      return
    }
    const ctx = this.ctx
    ctx.save()
    for (const point of this._selectedCurvePoints) {
      const trackRect = this.metrics?.trackRects.find(rect => rect.trackId === point.trackId)
      const curveStyle = this.config.tracks
        .find(track => track.id === point.trackId)
        ?.curves
        ?.find(curve => curve.curveName === point.curveName)
      const valueToX = trackRect && curveStyle ? this.getValueToX(curveStyle, trackRect.x, trackRect.width) : null
      if (!trackRect || !curveStyle || !valueToX) {
        continue
      }
      const px = Math.max(trackRect.x, Math.min(trackRect.x + trackRect.width, valueToX(point.value)))
      const py = this.depthToY(point.depth)
      if (py < this._headerHeight || py > this.canvasHeight) {
        continue
      }
      ctx.beginPath()
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#d32f2f'
      ctx.lineWidth = 1.6
      ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawSelectionRect() {
    if (!this._selectionRect) {
      return
    }
    const ctx = this.ctx
    const left = Math.min(this._selectionRect.x1, this._selectionRect.x2)
    const top = Math.min(this._selectionRect.y1, this._selectionRect.y2)
    const width = Math.abs(this._selectionRect.x2 - this._selectionRect.x1)
    const height = Math.abs(this._selectionRect.y2 - this._selectionRect.y1)
    ctx.save()
    ctx.fillStyle = 'rgba(64, 158, 255, 0.12)'
    ctx.strokeStyle = 'rgba(64, 158, 255, 0.9)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.fillRect(left, top, width, height)
    ctx.strokeRect(left, top, width, height)
    ctx.restore()
  }

  // ── Main render ──

  render() {
    const ctx = this.ctx
    this._fractureImageRects = []
    ctx.save()
    ctx.scale(this.dpr, this.dpr)

    // clear
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    // Empty state: no well selected or no tracks
    const visibleTracks = this.config.tracks.filter(t => t.visible)
    if (!this.config.wellName || visibleTracks.length === 0) {
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      ctx.fillStyle = '#999'
      ctx.font = '14px "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('请选择井', this.canvasWidth / 2, this.canvasHeight / 2)
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

    this.drawSelectedCurvePoints()
    this.drawSelectionRect()

    ctx.restore()
  }

  // ── Professional track header ──

  private drawTrackHeader(track: TrackConfig, x: number, w: number, hh: number) {
    const ctx = this.ctx
    const isSelected = track.id === this._selectedTrackId
    const pad = 4

    // background
    ctx.fillStyle = isSelected ? '#e8f0fe' : '#f5f5f5'
    ctx.fillRect(x, 0, w, hh)

    // outer border
    ctx.strokeStyle = isSelected ? '#409eff' : '#bbb'
    ctx.lineWidth = isSelected ? 1.5 : 0.5
    ctx.strokeRect(x, 0, w, hh)

    // For curve/discrete tracks: each curve gets its own bordered cell
    // Layout per cell (no title row):
    //   Row 1:  CurveName (unit)      ← centered, customizable font
    //   Row 2:  min ————————— max     ← min left, legend line center, max right
    if ((track.type === 'curve' || track.type === 'discrete') && track.curves?.length) {
      for (let ci = 0; ci < track.curves.length; ci++) {
        const cs = track.curves[ci]
        const cellTop = ci * HEADER_CURVE_H

        // dividing line between cells
        if (ci > 0) {
          ctx.strokeStyle = '#ccc'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(x, cellTop)
          ctx.lineTo(x + w, cellTop)
          ctx.stroke()
        }

        // Build font string from curve style
        const fontSize = cs.fontSize || 9
        const bold = cs.fontBold ? 'bold ' : ''
        const italic = cs.fontItalic ? 'italic ' : ''
        const fontStr = `${italic}${bold}${fontSize}px "Microsoft YaHei", sans-serif`
        const fontColor = cs.fontColor || '#333'

        // Row 1: curve name (unit)
        const nameStr = cs.unit ? `${cs.curveName}(${cs.unit})` : cs.curveName
        ctx.fillStyle = fontColor
        ctx.font = fontStr
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(nameStr, x + w / 2, cellTop + 2, w - 6)

        // Row 2: min — legend line — max (use same font but smaller for numbers)
        const numFontSize = Math.max(8, fontSize - 1)
        const numFont = `${numFontSize}px "Microsoft YaHei", sans-serif`
        const row2Y = cellTop + fontSize + 5
        const minStr = String(cs.min)
        const maxStr = String(cs.max)

        ctx.fillStyle = '#555'
        ctx.font = numFont
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(minStr, x + pad, row2Y + 4)
        const minW = ctx.measureText(minStr).width

        ctx.textAlign = 'right'
        ctx.fillText(maxStr, x + w - pad, row2Y + 4)
        const maxW = ctx.measureText(maxStr).width

        // colored legend line between min and max
        const lineX1 = x + pad + minW + 3
        const lineX2 = x + w - pad - maxW - 3
        if (lineX2 > lineX1 + 4) {
          ctx.lineWidth = Math.max(cs.lineWidth, 1.5)
          if (cs.valueColoring === false) {
            ctx.strokeStyle = cs.color
            if (cs.lineStyle === 'dashed')
              ctx.setLineDash([6, 3])
            else if (cs.lineStyle === 'dotted')
              ctx.setLineDash([2, 2])
            else
              ctx.setLineDash([])
            ctx.beginPath()
            ctx.moveTo(lineX1, row2Y + 4)
            ctx.lineTo(lineX2, row2Y + 4)
            ctx.stroke()
            ctx.setLineDash([])
          }
          else {
            const ramp = cs.colorRamp || FALLBACK_CURVE_COLOR_RAMP
            const gradient = ctx.createLinearGradient(lineX1, row2Y + 4, lineX2, row2Y + 4)
            gradient.addColorStop(0, ramp.low)
            gradient.addColorStop(0.5, ramp.mid)
            gradient.addColorStop(1, ramp.high)
            ctx.strokeStyle = gradient
            ctx.setLineDash([])
            ctx.beginPath()
            ctx.moveTo(lineX1, row2Y + 4)
            ctx.lineTo(lineX2, row2Y + 4)
            ctx.stroke()
          }
        }
      }
    }
    else {
      // Non-curve tracks: just show title centered in header
      ctx.fillStyle = '#333'
      ctx.font = HEADER_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(track.title, x + w / 2, hh / 2, w - 6)
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

    if (track.type === 'curve' || track.type === 'discrete') {
      this.drawVerticalGrid(track, x, y, w, h)
    }

    switch (track.type) {
      case 'formation':
        this.drawFormationTrack(track, x, y, w, h)
        break
      case 'depth':
        this.drawDepthTrack(x, y, w, h)
        break
      case 'lithology':
        this.drawLithologyTrack(track, x, y, w, h)
        break
      case 'curve':
        this.drawCurveTrack(track, x, y, w, h)
        break
      case 'discrete':
        this.drawDiscreteTrack(track, x, y, w, h)
        break
      case 'fracture':
        this.drawFractureTrack(track, x, y, w, h)
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

  private drawFormationTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
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
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, clampY1)
      ctx.lineTo(x + w, clampY1)
      ctx.stroke()

      // formation name — render full name vertically so intervals still show the label
      const segHeight = clampY2 - clampY1
      const midY = (clampY1 + clampY2) / 2
      const name = (track.formationColumn === 'code' ? layer.formation : layer.formation || '').trim()

      if (name && segHeight > 24) {
        ctx.fillStyle = '#222'
        ctx.font = 'bold 10px "Microsoft YaHei", "PingFang SC", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.save()
        ctx.translate(x + w / 2, midY)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(name, 0, 0, Math.max(0, segHeight - 8))
        ctx.restore()
      }
    }

    // bottom boundary of last layer
    if (layers.length > 0) {
      const lastY = this.depthToY(layers[layers.length - 1].bottom_depth)
      if (lastY >= y && lastY <= y + h) {
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1
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

  private drawLithologyTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const lithoData = this.data.lithology
    if (!lithoData.length)
      return

    // Pre-compute pattern IDs for all segments (used for same-lithology check)
    const patternIds = lithoData.map(l => matchLithologyId(l.description))

    for (let i = 0; i < lithoData.length; i++) {
      const litho = lithoData[i]
      const y1 = this.depthToY(litho.top_depth)
      const y2 = this.depthToY(litho.bottom_depth)
      if (y2 < y || y1 > y + h)
        continue

      const clampY1 = Math.max(y1, y)
      const clampY2 = Math.min(y2, y + h)
      const segW = w
      const segH = clampY2 - clampY1
      const patternId = patternIds[i]

      // 1. Fill background color (varies by rock type)
      ctx.fillStyle = getLithologyBgColor(patternId)
      ctx.fillRect(x, clampY1, segW, segH)

      // 2. Overlay pattern tile — draw black strokes on top of background
      //    Translate pattern origin to segment top-left so each lithology
      //    segment's texture starts from its own top, not from canvas (0,0).
      if (patternId) {
        const pattern = createLithologyPattern(ctx, patternId)
        if (pattern) {
          ctx.save()
          pattern.setTransform(new DOMMatrix().translateSelf(x, clampY1))
          ctx.fillStyle = pattern
          ctx.fillRect(x, clampY1, segW, segH)
          ctx.restore()
        }
      }

      // 3. Black border around each lithology segment
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 0.6
      ctx.strokeRect(x + 0.3, clampY1 + 0.3, segW - 0.6, segH - 0.6)

      if (
        this._selectedLithology
        && this._selectedLithology.trackId === track.id
        && this._selectedLithology.lithologyId === litho.id
      ) {
        ctx.save()
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, clampY1 + 1, Math.max(0, segW - 2), Math.max(0, segH - 2))
        ctx.restore()
      }

      // 4. Red triangle (△) at boundary if same lithology continues
      if (i > 0 && patternId !== null && patternIds[i - 1] === patternId) {
        this.drawSameLithologyTriangle(x, clampY1, w)
      }
    }
  }

  /** Draw a red outline triangle at a same-lithology boundary */
  private drawSameLithologyTriangle(x: number, boundaryY: number, w: number) {
    const ctx = this.ctx
    const triH = 7
    const triW = 8
    const cx = x + w / 2

    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx, boundaryY - triH)
    ctx.lineTo(cx - triW / 2, boundaryY)
    ctx.lineTo(cx + triW / 2, boundaryY)
    ctx.closePath()
    ctx.stroke()
  }

  // ── Curve track (continuous) ──

  private drawCurveTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    if (!track.curves?.length)
      return

    for (const cs of track.curves) {
      this.drawSingleCurve(cs, x, y, w, h)
    }
  }

  private drawSingleCurve(cs: CurveStyle, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const validPoints = this.getCurveRenderPoints(cs, x, y, w, h)
    if (validPoints.length < 2)
      return

    // fill area if configured
    if (cs.fill) {
      const baseX = cs.fill.direction === 'left' ? x : x + w
      ctx.globalAlpha = Math.max(0, Math.min(1, cs.fill.opacity ?? 1))

      if (cs.fill.customColor === true || cs.valueColoring === false) {
        ctx.fillStyle = cs.fill.customColor ? cs.fill.color : cs.color
        ctx.beginPath()
        ctx.moveTo(baseX, validPoints[0].py)
        for (const p of validPoints) {
          ctx.lineTo(p.px, p.py)
        }
        ctx.lineTo(baseX, validPoints[validPoints.length - 1].py)
        ctx.closePath()
        ctx.fill()
      }
      else {
        for (let i = 1; i < validPoints.length; i++) {
          const prev = validPoints[i - 1]
          const curr = validPoints[i]
          ctx.fillStyle = this.getCurveColor(cs, (prev.value + curr.value) / 2)
          ctx.beginPath()
          ctx.moveTo(baseX, prev.py)
          ctx.lineTo(prev.px, prev.py)
          ctx.lineTo(curr.px, curr.py)
          ctx.lineTo(baseX, curr.py)
          ctx.closePath()
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
    }

    const drawMode = cs.drawMode || 'line'
    if (drawMode === 'bar') {
      for (const p of validPoints) {
        ctx.strokeStyle = this.getCurveColor(cs, p.value)
        ctx.lineWidth = cs.lineWidth
        ctx.setLineDash([])
        if (cs.lineStyle === 'dashed')
          ctx.setLineDash([6, 3])
        else if (cs.lineStyle === 'dotted')
          ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(x, p.py)
        ctx.lineTo(p.px, p.py)
        ctx.stroke()
      }
    }
    else {
      for (let i = 1; i < validPoints.length; i++) {
        const prev = validPoints[i - 1]
        const curr = validPoints[i]
        ctx.strokeStyle = this.getCurveColor(cs, (prev.value + curr.value) / 2)
        ctx.lineWidth = cs.lineWidth
        ctx.setLineDash([])
        if (cs.lineStyle === 'dashed')
          ctx.setLineDash([6, 3])
        else if (cs.lineStyle === 'dotted')
          ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(prev.px, prev.py)
        ctx.lineTo(curr.px, curr.py)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])
  }

  // ── Discrete track (staircase style) ──

  private drawDiscreteTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    if (!track.curves?.length)
      return

    for (const cs of track.curves) {
      const validPoints = this.getCurveRenderPoints(cs, x, y, w, h)
      if (!validPoints.length)
        continue

      const drawMode = cs.drawMode || 'line'

      if (drawMode === 'bar') {
        for (const pt of validPoints) {
          ctx.strokeStyle = this.getCurveColor(cs, pt.value)
          ctx.lineWidth = cs.lineWidth
          ctx.setLineDash([])
          if (cs.lineStyle === 'dashed')
            ctx.setLineDash([6, 3])
          else if (cs.lineStyle === 'dotted')
            ctx.setLineDash([2, 2])
          ctx.beginPath()
          ctx.moveTo(x, pt.py)
          ctx.lineTo(pt.px, pt.py)
          ctx.stroke()
        }
      }
      else {
        let lastPoint: { px: number, py: number, value: number } | null = null
        for (const pt of validPoints) {
          if (lastPoint) {
            ctx.strokeStyle = this.getCurveColor(cs, (lastPoint.value + pt.value) / 2)
            ctx.lineWidth = cs.lineWidth
            ctx.setLineDash([])
            if (cs.lineStyle === 'dashed')
              ctx.setLineDash([6, 3])
            else if (cs.lineStyle === 'dotted')
              ctx.setLineDash([2, 2])
            ctx.beginPath()
            ctx.moveTo(lastPoint.px, lastPoint.py)
            ctx.lineTo(lastPoint.px, pt.py)
            ctx.lineTo(pt.px, pt.py)
            ctx.stroke()
          }
          lastPoint = pt
        }
      }
      ctx.setLineDash([])
    }
  }

  // ── Fracture image track ──

  private drawFractureTrack(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const images = track.fractureImages || []

    if (!images.length) {
      ctx.save()
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 4])
      ctx.strokeRect(x + 8, y + 8, Math.max(0, w - 16), Math.max(0, h - 16))
      ctx.setLineDash([])
      ctx.fillStyle = '#94a3b8'
      ctx.font = SMALL_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('导入裂缝图片', x + w / 2, y + h / 2)
      ctx.restore()
      return
    }

    for (const imageConfig of images) {
      const rect = this.getFractureImageRect(track.id, imageConfig)
      if (!rect) {
        continue
      }
      this._fractureImageRects.push(rect)

      const width = rect.right - rect.left
      const height = rect.bottom - rect.top
      if (width <= 1 || height <= 1) {
        continue
      }

      const image = this.getOrCreateImage(imageConfig.src)
      if (image && image.complete && image.naturalWidth > 0) {
        ctx.save()
        ctx.globalAlpha = imageConfig.opacity ?? 1
        ctx.drawImage(image, rect.left, rect.top, width, height)
        ctx.restore()
      }
      else {
        ctx.save()
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'
        ctx.strokeStyle = '#94a3b8'
        ctx.lineWidth = 1
        ctx.fillRect(rect.left, rect.top, width, height)
        ctx.strokeRect(rect.left, rect.top, width, height)
        ctx.fillStyle = '#64748b'
        ctx.font = SMALL_FONT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(imageConfig.name, rect.left + width / 2, rect.top + height / 2, Math.max(0, width - 8))
        ctx.restore()
      }

      if (
        this._selectedFractureImage
        && this._selectedFractureImage.trackId === track.id
        && this._selectedFractureImage.imageId === imageConfig.id
      ) {
        this.drawFractureSelection(rect)
      }
    }
  }

  // ── Interpretation track ──

  private drawInterpretationTrack(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const interps = [...this.data.interpretations].sort((a, b) => a.top_depth - b.top_depth)
    if (!interps.length)
      return

    const markerWidth = Math.min(18, Math.max(14, w * 0.2))
    const labelWidth = Math.max(0, w - markerWidth)

    for (let index = 0; index < interps.length; index++) {
      const interp = interps[index]
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
      ctx.fillRect(x + 1, clampY1, Math.max(0, labelWidth - 2), clampY2 - clampY1)
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
      const centerY = (clampY1 + clampY2) / 2
      if (segHeight > 12 && labelWidth > 12) {
        ctx.fillStyle = '#333'
        ctx.font = SMALL_FONT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(colorKey, x + labelWidth / 2, centerY, labelWidth - 8)
      }
      if (segHeight > 10 && markerWidth > 8) {
        ctx.fillStyle = '#222'
        ctx.font = 'bold 10px "Microsoft YaHei", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(index + 1), x + labelWidth + markerWidth / 2, centerY, markerWidth - 4)
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

      let cumulative = 0
      const vals: Array<{ start: number, end: number, color: string }> = []
      for (const mc of minerals) {
        const pts = this.data.curveData[mc.curveName]
        if (!pts)
          continue
        const pt = pts[i] || pts.find(p => Math.abs(p.depth - depth) < 0.5)
        const v = pt?.value != null && pt.value !== -9999 ? Math.max(0, pt.value) : 0
        if (v <= 0 || cumulative >= 100)
          continue
        const start = cumulative
        cumulative = Math.min(100, cumulative + v)
        vals.push({ start, end: cumulative, color: mc.color })
      }
      if (!vals.length)
        continue

      for (const { start, end, color } of vals) {
        const bx = x + (start / 100) * w
        const bw = ((end - start) / 100) * w
        if (bw < 0.3) {
          continue
        }
        ctx.fillStyle = color
        ctx.fillRect(bx, py, bw, barH)
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

  private drawVerticalGrid(track: TrackConfig, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const grid = this.getGridConfig()
    if (!grid.enabled) {
      this.debugGrid(track, 'skip', { reason: 'grid-disabled' })
      return
    }

    const logCurves = (track.curves || [])
      .map(curve => normalizeCurveStyle(curve))
      .filter(curve => curve.logarithmic && curve.min > 0 && curve.max > curve.min)
    if (logCurves.length > 0) {
      const logCurve = logCurves.reduce((widest, curve) => {
        const widestRange = Math.log10(widest.max) - Math.log10(widest.min)
        const curveRange = Math.log10(curve.max) - Math.log10(curve.min)
        return curveRange > widestRange ? curve : widest
      })
      const logRange = Math.log10(logCurve.max) - Math.log10(logCurve.min)
      const cycleCount = Math.max(1, Math.ceil(logRange))
      const cycleWidth = w / cycleCount
      const logTickMultipliers = [2, 4, 6, 8]
      const emphasizedMultipliers = new Set([4, 8])
      const majorWidth = Math.max(0.4, Math.min(grid.majorWidth, 0.5))
      const minorWidth = Math.max(0.25, Math.min(grid.minorWidth || 0.3, 0.32))

      for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex++) {
        const cycleStartX = x + cycleIndex * cycleWidth
        const mirrored = cycleIndex % 2 === 1
        for (const multiplier of logTickMultipliers) {
          const frac = Math.log10(multiplier)
          const lx = cycleStartX + (mirrored ? 1 - frac : frac) * cycleWidth
          const emphasized = emphasizedMultipliers.has(multiplier)
          ctx.strokeStyle = emphasized
            ? (mirrored ? 'rgba(232, 232, 232, 0.44)' : 'rgba(224, 224, 224, 0.72)')
            : (mirrored ? 'rgba(244, 244, 244, 0.5)' : 'rgba(240, 240, 240, 0.78)')
          ctx.lineWidth = emphasized
            ? majorWidth
            : minorWidth
          ctx.beginPath()
          ctx.moveTo(lx, y)
          ctx.lineTo(lx, y + h)
          ctx.stroke()
        }
      }

      ctx.strokeStyle = 'rgba(214, 214, 214, 0.94)'
      ctx.lineWidth = Math.max(0.45, Math.min(grid.majorWidth, 0.5))
      for (let cycleIndex = 1; cycleIndex < cycleCount; cycleIndex++) {
        const lx = x + cycleIndex * cycleWidth
        ctx.beginPath()
        ctx.moveTo(lx, y)
        ctx.lineTo(lx, y + h)
        ctx.stroke()
      }
      this.debugGrid(track, 'render-log-grid', {
        curveName: logCurve.curveName,
        logCurveCount: logCurves.length,
        min: logCurve.min,
        max: logCurve.max,
        logRange,
        cycleCount,
        width: Math.round(w),
        height: Math.round(h),
      })
      return
    }

    this.debugGrid(track, 'skip-log-grid', {
      reason: 'no-valid-log-curve',
      curves: (track.curves || []).map(curve => ({
        curveName: curve.curveName,
        logarithmic: !!curve.logarithmic,
        min: curve.min,
        max: curve.max,
      })),
    })

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
    ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
    const depthLabel = `${depth.toFixed(1)} m`
    this.drawFloatingLabel(mouseX + 8, mouseY - 16, depthLabel, 'rgba(255, 0, 0, 0.8)', '#fff')

    const hoverInfo = this.getHoverCurveInfo(mouseX, mouseY)
    if (hoverInfo) {
      ctx.beginPath()
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = this.getCurveColor(
        this.findCurveStyle(hoverInfo.curveName) || {
          curveName: hoverInfo.curveName,
          color: '#333',
          lineWidth: 1,
          lineStyle: 'solid',
          min: hoverInfo.value,
          max: hoverInfo.value + 1,
        },
        hoverInfo.value,
      )
      ctx.lineWidth = 1.5
      ctx.arc(hoverInfo.px, hoverInfo.py, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const valueLabel = `${hoverInfo.curveName}: ${hoverInfo.value.toFixed(3)}`
      const valueLabelWidth = ctx.measureText(valueLabel).width
      this.drawFloatingLabel(hoverInfo.px - valueLabelWidth - 14, hoverInfo.py - 16, valueLabel, 'rgba(51, 51, 51, 0.9)', '#fff')
    }

    ctx.restore()
  }

  private drawFloatingLabel(x: number, y: number, text: string, bgColor: string, fgColor: string) {
    const ctx = this.ctx
    const width = ctx.measureText(text).width
    const labelWidth = width + 8
    const drawX = Math.max(0, Math.min(x - 2, this.canvasWidth - labelWidth))
    const drawY = Math.max(0, Math.min(y - 2, this.canvasHeight - 16))
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.roundRect(drawX, drawY, labelWidth, 16, 3)
    ctx.fill()

    ctx.fillStyle = fgColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(text, drawX + 4, drawY + 2)
  }

  private getHoverCurveInfo(mouseX: number, mouseY: number): HoverCurveInfo | null {
    const track = this.findTrackAtX(mouseX)
    if (!track || (track.type !== 'curve' && track.type !== 'discrete')) {
      return null
    }
    const trackRect = this.metrics?.trackRects.find(rect => rect.trackId === track.id)
    if (!trackRect || !track.curves?.length) {
      return null
    }

    const depth = this.yToDepth(mouseY)
    let best: HoverCurveInfo | null = null
    for (const curve of track.curves) {
      const value = this.interpolateCurveValueAtDepth(curve.curveName, depth)
      if (value === null) {
        continue
      }
      const valueToX = this.getValueToX(curve, trackRect.x, trackRect.width)
      if (!valueToX) {
        continue
      }
      const px = Math.max(trackRect.x, Math.min(trackRect.x + trackRect.width, valueToX(value)))
      const distance = Math.abs(px - mouseX)
      if (distance > 10) {
        continue
      }
      if (!best || distance < Math.abs(best.px - mouseX)) {
        best = {
          curveName: curve.curveName,
          depth,
          value,
          px,
          py: mouseY,
        }
      }
    }
    return best
  }

  private interpolateCurveValueAtDepth(curveName: string, depth: number): number | null {
    const points = this.data.curveData[curveName]
    if (!points?.length) {
      return null
    }

    let left = 0
    let right = points.length - 1
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const current = points[mid]
      if (current.depth === depth) {
        return current.value === null || current.value === -9999 ? null : current.value
      }
      if (current.depth < depth) {
        left = mid + 1
      }
      else {
        right = mid - 1
      }
    }

    const prev = points[Math.max(0, right)]
    const next = points[Math.min(points.length - 1, left)]
    if (!prev || !next || prev.value === null || next.value === null || prev.value === -9999 || next.value === -9999) {
      return null
    }
    if (next.depth === prev.depth) {
      return prev.value
    }
    const ratio = (depth - prev.depth) / (next.depth - prev.depth)
    return prev.value + (next.value - prev.value) * ratio
  }

  private findCurveStyle(curveName: string): CurveStyle | null {
    for (const track of this.config.tracks) {
      for (const curve of track.curves || []) {
        if (curve.curveName === curveName) {
          return curve
        }
      }
    }
    return null
  }

  collectCurvePointsInRect(rect: SelectionRect): SelectedCurvePoint[] {
    if (!this.metrics?.trackRects.length) {
      return []
    }

    const left = Math.min(rect.x1, rect.x2)
    const right = Math.max(rect.x1, rect.x2)
    const top = Math.min(rect.y1, rect.y2)
    const bottom = Math.max(rect.y1, rect.y2)
    const bodyTop = this._headerHeight
    const bodyBottom = this.canvasHeight
    const trackXMap = new Map(this.metrics.trackRects.map(item => [item.trackId, item.x]))
    const selected: SelectedCurvePoint[] = []

    for (const trackRect of this.metrics.trackRects) {
      if (trackRect.x > right || trackRect.x + trackRect.width < left) {
        continue
      }
      const track = this.config.tracks.find(item => item.id === trackRect.trackId)
      if (!track || (track.type !== 'curve' && track.type !== 'discrete') || !track.curves?.length) {
        continue
      }

      for (const curve of track.curves) {
        const points = this.getCurveRenderPoints(curve, trackRect.x, bodyTop, trackRect.width, bodyBottom - bodyTop)
        for (const point of points) {
          if (point.px >= left && point.px <= right && point.py >= top && point.py <= bottom) {
            selected.push({
              trackId: track.id,
              curveName: curve.curveName,
              depth: point.depth,
              value: point.value,
              px: point.px,
              py: point.py,
            })
          }
        }
      }
    }

    return selected.sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth
      }
      const ax = trackXMap.get(a.trackId) ?? 0
      const bx = trackXMap.get(b.trackId) ?? 0
      if (ax !== bx) {
        return ax - bx
      }
      return a.curveName.localeCompare(b.curveName, 'zh-CN')
    })
  }

  findLithologyAtPoint(mouseX: number, mouseY: number): LithologySelection | null {
    const track = this.findTrackAtX(mouseX)
    if (!track || track.type !== 'lithology') {
      return null
    }
    for (const litho of this.data.lithology) {
      const y1 = this.depthToY(litho.top_depth)
      const y2 = this.depthToY(litho.bottom_depth)
      if (mouseY >= y1 && mouseY <= y2) {
        return {
          trackId: track.id,
          lithologyId: litho.id,
        }
      }
    }
    return null
  }

  findFractureImageAtPoint(mouseX: number, mouseY: number): FractureImageHitTarget | null {
    const orderedRects = [...this._fractureImageRects].reverse()
    for (const rect of orderedRects) {
      const width = rect.right - rect.left
      const height = rect.bottom - rect.top
      if (width <= 0 || height <= 0) {
        continue
      }

      const handles: Array<{ handle: FractureImageHandle, x: number, y: number }> = [
        { handle: 'nw', x: rect.left, y: rect.top },
        { handle: 'ne', x: rect.right, y: rect.top },
        { handle: 'sw', x: rect.left, y: rect.bottom },
        { handle: 'se', x: rect.right, y: rect.bottom },
      ]

      for (const item of handles) {
        if (
          mouseX >= item.x - FRACTURE_HANDLE_SIZE
          && mouseX <= item.x + FRACTURE_HANDLE_SIZE
          && mouseY >= item.y - FRACTURE_HANDLE_SIZE
          && mouseY <= item.y + FRACTURE_HANDLE_SIZE
        ) {
          return {
            trackId: rect.trackId,
            imageId: rect.imageId,
            handle: item.handle,
          }
        }
      }

      if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
        return {
          trackId: rect.trackId,
          imageId: rect.imageId,
          handle: 'move',
        }
      }
    }
    return null
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
