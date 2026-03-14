// ── Composite Log interaction: zoom, pan, crosshair, right-click, track drag/select ──

import type { CompositeLogRenderer, FractureImageHitTarget, SelectionRect } from './compositeLogRenderer'
import type { CompositeLogConfig, TrackConfig } from '@/types/compositeLog'
import { emitCompositeLogDebug } from './compositeLogDebug'

const DRAG_THRESHOLD = 5 // px — distinguish click from drag
const GESTURE_DECISION_DISTANCE = 6
const MIN_PAN_VERTICAL_DISTANCE = 8
const PAN_DIRECTION_RATIO = Math.tan(Math.PI / 3)
const INTERACTION_DEBUG_PREFIX = '[CompositeLog][interaction]'

export interface InteractionCallbacks {
  onDepthRangeChange: (min: number, max: number) => void
  onCrosshairMove: (x: number, y: number) => void
  onContextMenu: (event: MouseEvent, track: TrackConfig | null, depth: number) => void
  onRequestRender: () => void
  onSelectionRectChange?: (rect: SelectionRect | null) => void
  onSelectionComplete?: (rect: SelectionRect) => void
  onTrackReorder?: (fromTrackId: string, toTrackId: string) => void
  onTrackSelect?: (trackId: string | null) => void
  onFractureImageSelect?: (trackId: string | null, imageId: string | null) => void
  onFractureImageChange?: (
    trackId: string,
    imageId: string,
    next: { leftRatio: number, rightRatio: number, topDepth: number, bottomDepth: number },
  ) => void
}

export class CompositeLogInteraction {
  private canvas: HTMLCanvasElement
  private config: CompositeLogConfig
  private renderer: CompositeLogRenderer
  private callbacks: InteractionCallbacks
  private dpr: number

  // depth pan state
  private isPanning = false
  private panStartY = 0
  private panStartDepthMin = 0
  private panStartDepthMax = 0

  // track header drag state
  private isTrackDragging = false
  private dragSourceTrack: TrackConfig | null = null
  private isSelecting = false
  private selectionStart: { x: number, y: number } | null = null
  private bodyDragStart: { x: number, y: number } | null = null
  private fractureDragTarget: FractureImageHitTarget | null = null
  private fractureDragStartMouse: { x: number, y: number } | null = null
  private fractureDragStartBounds: { leftRatio: number, rightRatio: number, topDepth: number, bottomDepth: number } | null = null

  // click detection (to distinguish from drag)
  private mouseDownPos: { x: number, y: number } | null = null

  private boundWheel: (e: WheelEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundContextMenu: (e: MouseEvent) => void
  private boundMouseLeave: () => void

  constructor(
    canvas: HTMLCanvasElement,
    config: CompositeLogConfig,
    renderer: CompositeLogRenderer,
    callbacks: InteractionCallbacks,
  ) {
    this.canvas = canvas
    this.config = config
    this.renderer = renderer
    this.callbacks = callbacks
    this.dpr = window.devicePixelRatio || 1

    this.boundWheel = this.onWheel.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundContextMenu = this.onContextMenu.bind(this)
    this.boundMouseLeave = this.onMouseLeave.bind(this)

    this.attach()
  }

  updateConfig(config: CompositeLogConfig) {
    this.config = config
  }

  private lockTextSelection() {
    document.body.style.setProperty('user-select', 'none')
    document.body.style.setProperty('-webkit-user-select', 'none')
  }

  private unlockTextSelection() {
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('-webkit-user-select')
  }

  private debugLog(event: string, payload: Record<string, unknown>) {
    emitCompositeLogDebug({ channel: 'interaction', event, payload: { prefix: INTERACTION_DEBUG_PREFIX, ...payload } })
  }

  private get headerHeight(): number {
    return this.renderer.getHeaderHeight()
  }

  attach() {
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false })
    this.canvas.addEventListener('mousedown', this.boundMouseDown)
    this.canvas.addEventListener('contextmenu', this.boundContextMenu)
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave)
    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('mouseup', this.boundMouseUp)
  }

  detach() {
    this.canvas.removeEventListener('wheel', this.boundWheel)
    this.canvas.removeEventListener('mousedown', this.boundMouseDown)
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu)
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave)
    window.removeEventListener('mousemove', this.boundMouseMove)
    window.removeEventListener('mouseup', this.boundMouseUp)
    this.unlockTextSelection()
  }

  private getCanvasCoords(e: MouseEvent): { x: number, y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // ── Mouse wheel: zoom around cursor depth ──

  private onWheel(e: WheelEvent) {
    e.preventDefault()
    const { y } = this.getCanvasCoords(e)
    const centerDepth = this.renderer.yToDepth(y)

    const { min, max } = this.config.depthRange
    const range = max - min
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87
    const newRange = Math.max(10, Math.min(5000, range * zoomFactor))

    const ratio = (centerDepth - min) / range
    const newMin = centerDepth - newRange * ratio
    const newMax = centerDepth + newRange * (1 - ratio)

    this.callbacks.onDepthRangeChange(
      Math.max(0, Math.round(newMin * 10) / 10),
      Math.round(newMax * 10) / 10,
    )
  }

  // ── Mouse move: crosshair / pan / track drag ──

  private onMouseMove(e: MouseEvent) {
    const { x, y } = this.getCanvasCoords(e)
    const hh = this.headerHeight
    const canvasRect = this.canvas.getBoundingClientRect()
    const isInsideCanvas = e.clientX >= canvasRect.left
      && e.clientX <= canvasRect.right
      && e.clientY >= canvasRect.top
      && e.clientY <= canvasRect.bottom

    if (!isInsideCanvas && !this.isTrackDragging && !this.bodyDragStart && !this.isSelecting && !this.isPanning && !this.fractureDragTarget) {
      this.callbacks.onCrosshairMove(-1, -1)
      return
    }

    // Track header dragging
    if (this.isTrackDragging) {
      const targetTrack = this.renderer.findTrackAtX(x)
      if (targetTrack && targetTrack.id !== this.dragSourceTrack?.id) {
        this.canvas.style.cursor = 'col-resize'
      }
      else {
        this.canvas.style.cursor = 'grabbing'
      }
      return
    }

    if (this.fractureDragTarget && this.fractureDragStartMouse && this.fractureDragStartBounds) {
      const nextBounds = this.computeFractureBounds(this.fractureDragTarget, x, y)
      if (nextBounds) {
        this.callbacks.onFractureImageChange?.(
          this.fractureDragTarget.trackId,
          this.fractureDragTarget.imageId,
          nextBounds,
        )
        this.callbacks.onRequestRender()
      }
      this.canvas.style.cursor = this.getFractureCursor(this.fractureDragTarget.handle)
      return
    }

    if (this.bodyDragStart && !this.isSelecting && !this.isPanning) {
      const dx = x - this.bodyDragStart.x
      const dy = y - this.bodyDragStart.y
      if (Math.hypot(dx, dy) >= GESTURE_DECISION_DISTANCE) {
        const shouldPan = this.shouldStartPan(dx, dy)
        this.debugLog('gesture-decision', {
          dx: Math.round(dx * 100) / 100,
          dy: Math.round(dy * 100) / 100,
          distance: Math.round(Math.hypot(dx, dy) * 100) / 100,
          shouldPan,
          panRatio: PAN_DIRECTION_RATIO,
          minPanVerticalDistance: MIN_PAN_VERTICAL_DISTANCE,
        })
        if (shouldPan) {
          this.isPanning = true
          this.panStartY = this.bodyDragStart.y
          this.panStartDepthMin = this.config.depthRange.min
          this.panStartDepthMax = this.config.depthRange.max
          this.canvas.style.cursor = 'grabbing'
          this.debugLog('pan-start', {
            startX: Math.round(this.bodyDragStart.x),
            startY: Math.round(this.bodyDragStart.y),
            currentX: Math.round(x),
            currentY: Math.round(y),
          })
        }
        else {
          this.isSelecting = true
          this.selectionStart = { ...this.bodyDragStart }
          this.callbacks.onSelectionRectChange?.({
            x1: this.selectionStart.x,
            y1: this.selectionStart.y,
            x2: x,
            y2: y,
          })
          this.callbacks.onRequestRender()
          this.canvas.style.cursor = 'crosshair'
          this.debugLog('selection-start', {
            startX: Math.round(this.selectionStart.x),
            startY: Math.round(this.selectionStart.y),
            currentX: Math.round(x),
            currentY: Math.round(y),
          })
        }
      }
    }

    if (this.isSelecting) {
      if (this.selectionStart) {
        this.callbacks.onSelectionRectChange?.({
          x1: this.selectionStart.x,
          y1: this.selectionStart.y,
          x2: x,
          y2: y,
        })
        this.callbacks.onRequestRender()
      }
      this.canvas.style.cursor = 'crosshair'
      return
    }

    // Depth panning
    if (this.isPanning) {
      const dy = y - this.panStartY
      const { min, max } = this.config.depthRange
      const range = max - min
      const bodyHeight = this.canvas.height / this.dpr - hh
      const depthShift = (-dy / bodyHeight) * range

      const newMin = this.panStartDepthMin + depthShift
      const newMax = this.panStartDepthMax + depthShift

      this.callbacks.onDepthRangeChange(
        Math.max(0, Math.round(newMin * 10) / 10),
        Math.round(newMax * 10) / 10,
      )
      return
    }

    // Hover: change cursor in header area
    if (y < hh) {
      const track = this.renderer.findTrackAtX(x)
      this.canvas.style.cursor = track ? 'grab' : 'default'
    }
    else {
      const fractureHit = this.renderer.findFractureImageAtPoint(x, y)
      this.canvas.style.cursor = fractureHit ? this.getFractureCursor(fractureHit.handle) : 'crosshair'
    }

    this.callbacks.onCrosshairMove(x, y)
  }

  // ── Mouse down ──

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0)
      return
    e.preventDefault()
    this.lockTextSelection()
    const { x, y } = this.getCanvasCoords(e)
    this.mouseDownPos = { x, y }
    const hh = this.headerHeight

    // Click in header area → start track drag
    if (y < hh) {
      const track = this.renderer.findTrackAtX(x)
      if (track) {
        this.isTrackDragging = true
        this.dragSourceTrack = track
        this.canvas.style.cursor = 'grabbing'
        return
      }
    }

    if (y >= hh) {
      const fractureHit = this.renderer.findFractureImageAtPoint(x, y)
      if (fractureHit) {
        const startBounds = this.getFractureImageBounds(fractureHit.trackId, fractureHit.imageId)
        if (startBounds) {
          this.fractureDragTarget = fractureHit
          this.fractureDragStartMouse = { x, y }
          this.fractureDragStartBounds = startBounds
          this.callbacks.onFractureImageSelect?.(fractureHit.trackId, fractureHit.imageId)
          this.canvas.style.cursor = this.getFractureCursor(fractureHit.handle)
          return
        }
      }
      this.bodyDragStart = { x, y }
      this.panStartY = y
      this.panStartDepthMin = this.config.depthRange.min
      this.panStartDepthMax = this.config.depthRange.max
      this.canvas.style.cursor = 'crosshair'
      this.debugLog('body-drag-start', {
        x: Math.round(x),
        y: Math.round(y),
        depthMin: this.config.depthRange.min,
        depthMax: this.config.depthRange.max,
      })
    }
  }

  // ── Mouse up ──

  private onMouseUp(e: MouseEvent) {
    const { x, y } = this.getCanvasCoords(e)
    const wasClick = this.mouseDownPos
      && Math.abs(x - this.mouseDownPos.x) < DRAG_THRESHOLD
      && Math.abs(y - this.mouseDownPos.y) < DRAG_THRESHOLD

    // Finish track header drag
    if (this.isTrackDragging) {
      if (wasClick) {
        // It was a click, not a drag → select the track
        const track = this.renderer.findTrackAtX(x)
        this.callbacks.onTrackSelect?.(track?.id ?? null)
      }
      else {
        // It was a drag → reorder
        const targetTrack = this.renderer.findTrackAtX(x)
        if (
          targetTrack
          && this.dragSourceTrack
          && targetTrack.id !== this.dragSourceTrack.id
          && this.callbacks.onTrackReorder
        ) {
          this.callbacks.onTrackReorder(this.dragSourceTrack.id, targetTrack.id)
        }
      }
      this.isTrackDragging = false
      this.dragSourceTrack = null
      this.canvas.style.cursor = 'crosshair'
      this.mouseDownPos = null
      this.unlockTextSelection()
      return
    }

    if (this.fractureDragTarget) {
      this.fractureDragTarget = null
      this.fractureDragStartMouse = null
      this.fractureDragStartBounds = null
      const fractureHit = this.renderer.findFractureImageAtPoint(x, y)
      this.canvas.style.cursor = fractureHit ? this.getFractureCursor(fractureHit.handle) : 'crosshair'
      this.mouseDownPos = null
      this.unlockTextSelection()
      return
    }

    if (this.isSelecting) {
      const selectionRect = this.selectionStart
        ? { x1: this.selectionStart.x, y1: this.selectionStart.y, x2: x, y2: y }
        : null
      if (selectionRect) {
        this.debugLog('selection-complete', {
          x1: Math.round(selectionRect.x1),
          y1: Math.round(selectionRect.y1),
          x2: Math.round(selectionRect.x2),
          y2: Math.round(selectionRect.y2),
          width: Math.round(Math.abs(selectionRect.x2 - selectionRect.x1)),
          height: Math.round(Math.abs(selectionRect.y2 - selectionRect.y1)),
        })
      }
      this.isSelecting = false
      this.selectionStart = null
      this.bodyDragStart = null
      this.callbacks.onSelectionRectChange?.(selectionRect)
      if (selectionRect) {
        this.callbacks.onSelectionComplete?.(selectionRect)
      }
      this.canvas.style.cursor = 'crosshair'
      this.mouseDownPos = null
      this.unlockTextSelection()
      return
    }

    // Finish depth pan
    if (this.isPanning) {
      this.debugLog('pan-complete', {
        startDepthMin: this.panStartDepthMin,
        startDepthMax: this.panStartDepthMax,
        endDepthMin: this.config.depthRange.min,
        endDepthMax: this.config.depthRange.max,
      })
      this.isPanning = false
      this.bodyDragStart = null
      this.canvas.style.cursor = 'crosshair'
      this.mouseDownPos = null
      this.unlockTextSelection()
      return
    }

    if (this.bodyDragStart) {
      if (wasClick) {
        const track = this.renderer.findTrackAtX(x)
        this.callbacks.onTrackSelect?.(track?.id ?? null)
      }
      this.bodyDragStart = null
    }

    this.mouseDownPos = null
    this.unlockTextSelection()
  }

  private onMouseLeave() {
    if (this.isPanning || this.isTrackDragging || this.isSelecting || this.bodyDragStart || this.fractureDragTarget) {
      this.debugLog('mouse-leave-during-drag', {
        isPanning: this.isPanning,
        isTrackDragging: this.isTrackDragging,
        isSelecting: this.isSelecting,
        hasBodyDragStart: !!this.bodyDragStart,
        hasFractureDrag: !!this.fractureDragTarget,
      })
      return
    }
    this.isPanning = false
    this.isTrackDragging = false
    this.dragSourceTrack = null
    this.isSelecting = false
    this.selectionStart = null
    this.bodyDragStart = null
    this.mouseDownPos = null
    this.canvas.style.cursor = 'crosshair'
    this.callbacks.onSelectionRectChange?.(null)
    this.callbacks.onCrosshairMove(-1, -1)
    this.unlockTextSelection()
  }

  private getFractureImageBounds(trackId: string, imageId: string) {
    const track = this.config.tracks.find(item => item.id === trackId)
    const image = track?.fractureImages?.find(item => item.id === imageId)
    if (!image) {
      return null
    }
    return {
      leftRatio: image.leftRatio,
      rightRatio: image.rightRatio,
      topDepth: image.topDepth,
      bottomDepth: image.bottomDepth,
    }
  }

  private getFractureCursor(handle: FractureImageHitTarget['handle']): string {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize'
      case 'ne':
      case 'sw':
        return 'nesw-resize'
      default:
        return 'move'
    }
  }

  private computeFractureBounds(hit: FractureImageHitTarget, mouseX: number, mouseY: number) {
    const startBounds = this.fractureDragStartBounds
    const startMouse = this.fractureDragStartMouse
    const trackRect = this.renderer.getTrackBodyRect(hit.trackId)
    if (!startBounds || !startMouse || !trackRect) {
      return null
    }

    const minWidthRatio = Math.max(0.08, 18 / Math.max(trackRect.width, 1))
    const minDepthSpan = Math.max(1, Math.abs(this.renderer.yToDepth(trackRect.y + 24) - this.renderer.yToDepth(trackRect.y)))
    const depthMin = this.config.depthRange.min
    const depthMax = this.config.depthRange.max
    const widthRatio = startBounds.rightRatio - startBounds.leftRatio

    let leftRatio = startBounds.leftRatio
    let rightRatio = startBounds.rightRatio
    let topDepth = startBounds.topDepth
    let bottomDepth = startBounds.bottomDepth

    if (hit.handle === 'move') {
      const dxRatio = (mouseX - startMouse.x) / Math.max(trackRect.width, 1)
      const startTopY = this.renderer.depthToY(startBounds.topDepth)
      const depthShift = this.renderer.yToDepth(startTopY + (mouseY - startMouse.y)) - this.renderer.yToDepth(startTopY)

      leftRatio = Math.max(0, Math.min(startBounds.leftRatio + dxRatio, 1 - widthRatio))
      rightRatio = leftRatio + widthRatio

      topDepth = startBounds.topDepth + depthShift
      bottomDepth = startBounds.bottomDepth + depthShift
      if (topDepth < depthMin) {
        bottomDepth += depthMin - topDepth
        topDepth = depthMin
      }
      if (bottomDepth > depthMax) {
        topDepth -= bottomDepth - depthMax
        bottomDepth = depthMax
      }
      if (topDepth < depthMin) {
        topDepth = depthMin
      }
      if (bottomDepth > depthMax) {
        bottomDepth = depthMax
      }
    }
    else {
      const pointerRatio = Math.max(0, Math.min((mouseX - trackRect.x) / Math.max(trackRect.width, 1), 1))
      const pointerDepth = Math.max(depthMin, Math.min(this.renderer.yToDepth(mouseY), depthMax))

      if (hit.handle === 'nw' || hit.handle === 'sw') {
        leftRatio = Math.min(pointerRatio, startBounds.rightRatio - minWidthRatio)
      }
      if (hit.handle === 'ne' || hit.handle === 'se') {
        rightRatio = Math.max(pointerRatio, startBounds.leftRatio + minWidthRatio)
      }
      if (hit.handle === 'nw' || hit.handle === 'ne') {
        topDepth = Math.min(pointerDepth, startBounds.bottomDepth - minDepthSpan)
      }
      if (hit.handle === 'sw' || hit.handle === 'se') {
        bottomDepth = Math.max(pointerDepth, startBounds.topDepth + minDepthSpan)
      }

      leftRatio = Math.max(0, Math.min(leftRatio, 1 - minWidthRatio))
      rightRatio = Math.max(leftRatio + minWidthRatio, Math.min(rightRatio, 1))
      topDepth = Math.max(depthMin, Math.min(topDepth, depthMax - minDepthSpan))
      bottomDepth = Math.max(topDepth + minDepthSpan, Math.min(bottomDepth, depthMax))
    }

    return {
      leftRatio,
      rightRatio,
      topDepth,
      bottomDepth,
    }
  }

  private shouldStartPan(dx: number, dy: number): boolean {
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    return absDy >= MIN_PAN_VERTICAL_DISTANCE && absDy > absDx * PAN_DIRECTION_RATIO
  }

  // ── Right-click context menu ──

  private onContextMenu(e: MouseEvent) {
    e.preventDefault()
    const { x, y } = this.getCanvasCoords(e)
    const depth = this.renderer.yToDepth(y)
    const track = this.renderer.findTrackAtX(x)
    const fractureHit = this.renderer.findFractureImageAtPoint(x, y)
    if (fractureHit) {
      this.callbacks.onFractureImageSelect?.(fractureHit.trackId, fractureHit.imageId)
    }
    this.callbacks.onContextMenu(e, track, depth)
  }
}
