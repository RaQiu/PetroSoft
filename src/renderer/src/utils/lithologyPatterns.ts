// ── Lithology pattern generation for Canvas 2D ──
// Each function draws a repeatable tile, then creates a CanvasPattern.

const TILE = 16

type PatternDrawer = (ctx: CanvasRenderingContext2D, s: number, bg: string) => void

// ── Pattern drawers ──

const drawSandstone: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#8B7355'
  const r = 1.0
  for (const [x, y] of [[4, 4], [12, 4], [8, 8], [4, 12], [12, 12]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
}

const drawSandstoneCoarse: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#8B6914'
  for (const [x, y] of [[4, 4], [12, 4], [8, 9], [4, 13], [12, 13]]) {
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill()
  }
}

const drawSandstoneMedium: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#8B7355'
  for (const [x, y] of [[4, 4], [12, 4], [8, 8], [4, 12], [12, 12]]) {
    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill()
  }
}

const drawSandstoneFine: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#9E8B6E'
  for (let y = 3; y < s; y += 5) {
    for (let x = 3; x < s; x += 5) {
      ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill()
    }
  }
}

const drawSiltstone: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#8B7355'
  for (let y = 2; y < s; y += 3) {
    for (let x = 2; x < s; x += 3) {
      ctx.beginPath(); ctx.arc(x, y, 0.5, 0, Math.PI * 2); ctx.fill()
    }
  }
}

const drawMudstone: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 0.6
  for (let y = 4; y < s; y += 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke()
  }
}

const drawShale: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 0.5
  // dashed horizontal
  for (let y = 3; y < s; y += 4) {
    for (let x = 0; x < s; x += 5) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y); ctx.stroke()
    }
  }
}

const drawSandyMudstone: PatternDrawer = (ctx, s, bg) => {
  drawMudstone(ctx, s, bg)
  ctx.fillStyle = '#8B7355'
  ctx.beginPath(); ctx.arc(4, 6, 0.8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(12, 10, 0.8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(8, 14, 0.8, 0, Math.PI * 2); ctx.fill()
}

const drawMuddySandstone: PatternDrawer = (ctx, s, bg) => {
  drawSandstone(ctx, s, bg)
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 0.4
  ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke()
}

const drawLimestone: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#4682B4'
  ctx.lineWidth = 0.6
  // brick pattern
  ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s / 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s / 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(s / 4, s / 2); ctx.lineTo(s / 4, s); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(s * 3 / 4, s / 2); ctx.lineTo(s * 3 / 4, s); ctx.stroke()
}

const drawDolomite: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#8B008B'
  ctx.lineWidth = 0.6
  const h = s / 2
  // diamond
  ctx.beginPath()
  ctx.moveTo(h, 1); ctx.lineTo(s - 1, h); ctx.lineTo(h, s - 1); ctx.lineTo(1, h)
  ctx.closePath(); ctx.stroke()
}

const drawMarl: PatternDrawer = (ctx, s, bg) => {
  drawLimestone(ctx, s, bg)
  ctx.strokeStyle = '#777'
  ctx.lineWidth = 0.3
  ctx.setLineDash([1.5, 1.5])
  ctx.beginPath(); ctx.moveTo(0, s / 4); ctx.lineTo(s, s / 4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, s * 3 / 4); ctx.lineTo(s, s * 3 / 4); ctx.stroke()
  ctx.setLineDash([])
}

const drawConglomerate: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#8B4513'
  ctx.lineWidth = 0.7
  for (const [cx, cy, r] of [[5, 5, 2.5], [12, 8, 2], [7, 13, 1.8]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  }
}

const drawCoal: PatternDrawer = (ctx, s, bg) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 0.7
  for (let i = -s; i < s * 2; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke()
  }
}

// ── Registry ──

const DRAWERS: Record<string, PatternDrawer> = {
  sandstone: drawSandstone,
  sandstone_coarse: drawSandstoneCoarse,
  sandstone_medium: drawSandstoneMedium,
  sandstone_fine: drawSandstoneFine,
  siltstone: drawSiltstone,
  mudstone: drawMudstone,
  shale: drawShale,
  sandy_mudstone: drawSandyMudstone,
  muddy_sandstone: drawMuddySandstone,
  limestone: drawLimestone,
  dolomite: drawDolomite,
  marl: drawMarl,
  conglomerate: drawConglomerate,
  coal: drawCoal
}

// Pattern cache — avoid recreating tiles every frame
const patternCache = new Map<string, CanvasPattern | null>()

export function createLithologyPattern(
  ctx: CanvasRenderingContext2D,
  patternType: string,
  color: string,
  tileSize = TILE
): CanvasPattern | string {
  const key = `${patternType}_${color}_${tileSize}`
  if (patternCache.has(key)) {
    return patternCache.get(key) ?? color
  }

  const drawer = DRAWERS[patternType]
  if (!drawer) {
    patternCache.set(key, null)
    return color
  }

  const tile = document.createElement('canvas')
  tile.width = tileSize
  tile.height = tileSize
  const tileCtx = tile.getContext('2d')!
  drawer(tileCtx, tileSize, color)

  const pattern = ctx.createPattern(tile, 'repeat')
  patternCache.set(key, pattern)
  return pattern ?? color
}

/** Clear cache (call when context changes) */
export function clearPatternCache() {
  patternCache.clear()
}
