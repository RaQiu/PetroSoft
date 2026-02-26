// ── Composite Log interaction: zoom, pan, crosshair, right-click, track drag/select ──

import type { CompositeLogRenderer } from './compositeLogRenderer'
import type { CompositeLogConfig, TrackConfig } from '@/types/compositeLog'

const DRAG_THRESHOLD = 5 // px — distinguish click from drag

export interface InteractionCallbacks {
  onDepthRangeChange: (min: number, max: number) => void
  onCrosshairMove: (x: number, y: number) => void
  onContextMenu: (event: MouseEvent, track: TrackConfig | null, depth: number) => void
  onRequestRender: () => void
  onTrackReorder?: (fromTrackId: string, toTrackId: string) => void
  onTrackSelect?: (trackId: string | null) => void
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

  private get headerHeight(): number {
    return this.renderer.getHeaderHeight()
  }

  attach() {
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false })
    this.canvas.addEventListener('mousemove', this.boundMouseMove)
    this.canvas.addEventListener('mousedown', this.boundMouseDown)
    this.canvas.addEventListener('mouseup', this.boundMouseUp)
    this.canvas.addEventListener('contextmenu', this.boundContextMenu)
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave)
  }

  detach() {
    this.canvas.removeEventListener('wheel', this.boundWheel)
    this.canvas.removeEventListener('mousemove', this.boundMouseMove)
    this.canvas.removeEventListener('mousedown', this.boundMouseDown)
    this.canvas.removeEventListener('mouseup', this.boundMouseUp)
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu)
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave)
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
      this.canvas.style.cursor = 'crosshair'
    }

    this.callbacks.onCrosshairMove(x, y)
  }

  // ── Mouse down ──

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0)
      return
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

    // Click in body area → start depth pan
    this.isPanning = true
    this.panStartY = y
    this.panStartDepthMin = this.config.depthRange.min
    this.panStartDepthMax = this.config.depthRange.max
    this.canvas.style.cursor = 'grabbing'
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
      return
    }

    // Finish depth pan
    if (this.isPanning) {
      if (wasClick) {
        // Click in body → select track at x
        const track = this.renderer.findTrackAtX(x)
        this.callbacks.onTrackSelect?.(track?.id ?? null)
      }
      this.isPanning = false
      this.canvas.style.cursor = 'crosshair'
    }

    this.mouseDownPos = null
  }

  private onMouseLeave() {
    this.isPanning = false
    this.isTrackDragging = false
    this.dragSourceTrack = null
    this.mouseDownPos = null
    this.canvas.style.cursor = 'crosshair'
    this.callbacks.onCrosshairMove(-1, -1)
  }

  // ── Right-click context menu ──

  private onContextMenu(e: MouseEvent) {
    e.preventDefault()
    const { x, y } = this.getCanvasCoords(e)
    const depth = this.renderer.yToDepth(y)
    const track = this.renderer.findTrackAtX(x)
    this.callbacks.onContextMenu(e, track, depth)
  }
}
