// ── GB/T 958 Lithology patterns — procedural Canvas tiles ──
// Patterns are drawn programmatically for crisp rendering at any scale.
// Tile dimensions use a wide rectangle (~3:1) matching the GB/T 958 standard.

// ── Pattern name registry (GB/T 958 standard) ──

export const LITHOLOGY_NAMES: Record<number, string> = {
  1: '巨砾岩', 2: '小砾岩', 3: '粗砾岩', 4: '中砾岩', 5: '细砾岩',
  6: '角砾岩', 7: '砾岩', 8: '砂砾岩', 9: '泥砾岩', 10: '粗砂岩',
  11: '中砂岩', 12: '中-细砂岩', 13: '细砂岩', 14: '粉-细砂岩', 15: '泥质粉砂岩',
  16: '砂岩', 17: '长石中砂岩', 18: '长石砂岩', 19: '不等粒砂岩', 20: '不等粒石英砂岩',
  21: '石英砂岩', 22: '长石石英砂岩', 23: '海绿石粗砂岩', 24: '海绿石中砂岩', 25: '海绿石细砂岩',
  26: '海绿石粉砂岩', 27: '鲕状砂岩', 28: '粉砂岩', 29: '粉砂质泥岩', 30: '泥岩',
  31: '油页岩', 32: '页岩', 33: '砂质页岩', 34: '碳质页岩', 35: '沥青质页岩',
  36: '硅质页岩', 37: '灰质页岩', 38: '铝土质页岩', 39: '含砾泥岩', 40: '碳质泥岩',
  41: '白云质泥岩', 42: '石膏质泥岩', 43: '盐质泥岩', 44: '沥青质泥岩', 45: '硅质泥岩',
  46: '灰质泥岩', 47: '玄武质泥岩', 48: '铝土质泥岩', 49: '凝灰质泥岩', 50: '软泥岩',
  51: '油泥岩', 52: '硅化泥岩', 53: '芒硝泥岩', 54: '煤', 55: '瘤状灰岩',
  56: '凝灰质砂砾岩', 57: '薄层状灰岩', 58: '石灰岩', 59: '泥灰岩', 60: '成岩白云岩',
  61: '泥云岩', 62: '生物灰岩', 63: '粗晶灰岩', 64: '中晶灰岩', 65: '细晶灰岩',
  66: '粉晶灰岩', 67: '巨晶灰岩', 68: '不等晶灰岩', 69: '泥晶粉屑灰岩', 70: '不等晶白云岩',
  71: '细晶白云岩', 72: '中晶白云岩', 73: '粗晶白云岩', 74: '白云岩', 75: '泥晶粒屑灰岩',
  76: '泥晶砾屑灰岩', 77: '砂屑泥晶灰岩', 78: '壳晶砂屑灰岩', 79: '粉砂质灰岩', 80: '壳晶粒屑灰岩',
  81: '粒屑泥晶灰岩', 82: '泥晶砂屑灰岩', 83: '沥青灰岩', 84: '白云岩化砂质灰岩', 85: '沥青质白云岩',
  86: '硅质灰岩', 87: '白云质石灰岩', 88: '燧石条带灰岩', 89: '燧石结核灰岩', 90: '角砾状灰岩',
  91: '竹叶状灰岩', 92: '团块灰岩', 93: '针孔状灰岩', 94: '蠕状灰岩', 95: '介壳灰岩',
  96: '含螺灰岩', 97: '溶孔蠕粒灰岩', 98: '蠕粒溶孔灰岩', 99: '溶孔角砾灰岩', 100: '角砾溶孔灰岩',
  101: '砂屑溶孔灰岩', 102: '溶孔砂屑灰岩', 103: '含溶孔蠕粒灰岩', 104: '含溶孔角砾灰岩',
  105: '含溶孔砂屑灰岩', 106: '溶孔豆粒灰岩', 107: '豆粒溶孔灰岩', 108: '溶孔砾屑灰岩',
  109: '砾屑溶孔灰岩', 110: '含溶孔砾屑灰岩', 111: '针孔状蠕粒灰岩', 112: '针孔状角砾灰岩',
  113: '角砾针孔状灰岩', 114: '砂屑针孔状灰岩', 115: '针孔状砂屑灰岩', 116: '砾屑针孔状灰岩',
  117: '针孔状砾屑灰岩', 118: '含白云石灰岩', 119: '含泥灰岩', 120: '页状灰岩',
  121: '生屑灰岩', 122: '生物礁灰岩', 123: '介形虫灰岩', 124: '生物礁白云岩',
  125: '泥质条带白云岩', 126: '石膏质白云岩', 127: '团块白云岩', 128: '含白垩灰岩',
  129: '泥质条带灰岩', 130: '石膏质灰岩', 131: '云灰岩', 132: '藻灰岩',
  133: '沉凝灰岩', 134: '含灰白云岩', 135: '灰质白云岩', 136: '泥质白云岩', 137: '砂质白云岩',
  138: '角砾状白云岩', 139: '针孔状白云岩', 140: '蠕状白云岩', 141: '燧石结核白云岩',
  142: '溶孔蠕粒白云岩', 143: '蠕粒溶孔白云岩', 144: '溶孔角砾云岩', 145: '角砾溶孔云岩',
  146: '砂屑溶孔云岩', 147: '溶孔砂屑云岩', 148: '含溶孔蠕粒白云岩', 149: '含溶孔角砾云岩',
  150: '含溶孔砂屑云岩', 151: '溶孔豆粒云岩', 152: '豆粒溶孔云岩', 153: '溶孔砾屑白云岩',
  154: '砾屑溶孔白云岩', 155: '含溶孔砾屑白云岩', 156: '针孔状蠕粒白云岩', 157: '蠕粒针孔状云岩',
  158: '针孔状角砾白云岩', 159: '角砾针孔状云岩', 160: '砂屑针孔状云岩', 161: '针孔状砂屑云岩',
  162: '砾屑针孔状云岩', 163: '针孔状砾屑云岩', 164: '藻云岩', 165: '生物白云岩',
  166: '含凝灰质泥质粉砂岩', 167: '含凝灰质粉砂质泥岩', 168: '角砾晶屑凝灰岩', 169: '含角砾熔结凝灰岩',
  170: '含角砾晶屑岩屑凝灰岩', 171: '白云石化沉凝灰岩', 172: '晶屑凝灰岩', 173: '含角砾晶屑凝灰岩',
  174: '熔结角砾岩', 175: '火山角砾岩', 176: '含凝灰质熔结角砾岩', 177: '凝灰质熔结角砾岩',
  178: '集块岩', 179: '炎屑晶屑凝灰岩', 180: '集块熔岩', 181: '角砾凝灰岩',
  182: '安山火山角砾岩', 183: '流纹质火山角砾岩', 184: '凝灰岩', 185: '煤层',
  186: '钾盐', 187: '岩盐', 188: '钙芒硝岩', 189: '芒硝', 190: '盐岩',
  191: '泥膏岩', 192: '石膏层', 193: '膏盐层', 194: '石膏岩', 195: '铝土岩',
  196: '铁矿层', 197: '黄铁矿', 198: '锰矿层', 199: '磷块岩', 200: '硼砂',
  201: '重晶石', 202: '白垩土', 203: '膨润土', 204: '贝壳层', 205: '赤铁矿',
  206: '菱铁矿', 207: '介形虫层', 208: '杂卤石', 209: '燧石层', 210: '含膏',
  211: '膏盐岩', 212: '含膏盐岩', 213: '含镁盐岩', 214: '铁矿岩', 215: '硅质岩',
  216: '构造角砾岩', 217: '断层角砾岩', 218: '断层泥', 219: '基岩', 220: '英安岩',
  221: '角闪石岩', 222: '安山岩', 223: '玄武岩', 224: '安山玄武岩', 225: '玄武质安山岩',
  226: '细碧岩', 227: '闪长岩', 228: '正长岩', 229: '斑岩', 230: '矽卡岩',
  231: '辉绿岩', 232: '煌斑岩', 233: '云煌岩', 234: '酸性喷发岩', 235: '中性喷发岩',
  236: '超基性侵入岩', 237: '基性侵入岩', 238: '中性侵入岩', 239: '酸性侵入岩', 240: '橄榄岩',
  241: '辉长岩', 242: '辉石岩', 243: '苏长岩', 244: '斜长岩', 245: '玄武安山岩',
  246: '闪长玢岩', 247: '安山玢岩', 248: '角闪岩', 249: '花岗岩', 250: '英安斑岩',
  251: '基性喷发岩', 252: '伟晶岩', 253: '粗面岩', 254: '流纹斑岩', 255: '流纹岩',
  256: '安山粗面岩', 257: '碎裂岩', 258: '大理岩', 259: '硬砂岩', 260: '变余砂岩',
  261: '硅石层', 262: '变质岩', 263: '蛇纹岩', 264: '片岩', 265: '石英片岩',
  266: '绿泥片岩', 267: '黑云片岩', 268: '千枚岩', 269: '绿泥千枚岩', 270: '绢云母千枚岩',
  271: '板岩', 272: '绿泥石板岩', 273: '糜棱岩', 274: '片麻岩', 275: '花岗片麻岩',
  276: '碳质板岩', 277: '硅质板岩', 278: '绢云母化千枚岩', 279: '变质砂岩', 280: '变质砾岩',
  281: '石英岩', 282: '混合岩', 283: '绿豆岩', 284: '粘土', 285: '填筑土',
  286: '腐殖土层', 287: '积土层', 288: '红土', 289: '卵石', 290: '砾石',
  291: '角砾石', 292: '砂砾石', 293: '泥砾石', 294: '粉砂质砾石', 295: '粘土质砾石',
  296: '砂质粘土', 297: '粉砂质粘土', 298: '化学沉积', 299: '植物堆积层', 300: '泥炭土',
  301: '火山集块岩',
}

// ── Keyword → pattern ID matching ──
// Ordered by specificity (longer/more specific keywords first)

interface KeywordEntry {
  keywords: string[]
  id: number
}

const KEYWORD_TABLE: KeywordEntry[] = [
  // ── 砾岩类 ──
  { keywords: ['巨砾岩'], id: 1 },
  { keywords: ['小砾岩'], id: 2 },
  { keywords: ['粗砾岩'], id: 3 },
  { keywords: ['中砾岩'], id: 4 },
  { keywords: ['细砾岩'], id: 5 },
  { keywords: ['角砾岩'], id: 6 },
  { keywords: ['砂砾岩'], id: 8 },
  { keywords: ['泥砾岩'], id: 9 },
  { keywords: ['砾岩'], id: 7 },
  // ── 砂岩类 ──
  { keywords: ['粗砂岩'], id: 10 },
  { keywords: ['中-细砂岩'], id: 12 },
  { keywords: ['中砂岩'], id: 11 },
  { keywords: ['粉-细砂岩'], id: 14 },
  { keywords: ['细砂岩'], id: 13 },
  { keywords: ['泥质粉砂岩'], id: 15 },
  { keywords: ['长石中砂岩'], id: 17 },
  { keywords: ['长石石英砂岩'], id: 22 },
  { keywords: ['长石砂岩'], id: 18 },
  { keywords: ['不等粒石英砂岩'], id: 20 },
  { keywords: ['不等粒砂岩'], id: 19 },
  { keywords: ['石英砂岩'], id: 21 },
  { keywords: ['海绿石粗砂岩'], id: 23 },
  { keywords: ['海绿石中砂岩'], id: 24 },
  { keywords: ['海绿石细砂岩'], id: 25 },
  { keywords: ['海绿石粉砂岩'], id: 26 },
  { keywords: ['鲕状砂岩'], id: 27 },
  { keywords: ['粉砂质泥岩'], id: 29 },
  { keywords: ['粉砂岩'], id: 28 },
  { keywords: ['砂岩'], id: 16 },
  // ── 泥岩/页岩类 ──
  { keywords: ['油页岩'], id: 31 },
  { keywords: ['砂质页岩'], id: 33 },
  { keywords: ['碳质页岩'], id: 34 },
  { keywords: ['沥青质页岩'], id: 35 },
  { keywords: ['硅质页岩'], id: 36 },
  { keywords: ['灰质页岩'], id: 37 },
  { keywords: ['铝土质页岩'], id: 38 },
  { keywords: ['泥页岩', '页岩'], id: 32 },
  { keywords: ['含砾泥岩'], id: 39 },
  { keywords: ['碳质泥岩'], id: 40 },
  { keywords: ['白云质泥岩'], id: 41 },
  { keywords: ['石膏质泥岩'], id: 42 },
  { keywords: ['盐质泥岩'], id: 43 },
  { keywords: ['沥青质泥岩'], id: 44 },
  { keywords: ['硅质泥岩'], id: 45 },
  { keywords: ['灰质泥岩'], id: 46 },
  { keywords: ['玄武质泥岩'], id: 47 },
  { keywords: ['铝土质泥岩'], id: 48 },
  { keywords: ['凝灰质泥岩'], id: 49 },
  { keywords: ['软泥岩'], id: 50 },
  { keywords: ['油泥岩'], id: 51 },
  { keywords: ['硅化泥岩'], id: 52 },
  { keywords: ['芒硝泥岩'], id: 53 },
  { keywords: ['泥岩'], id: 30 },
  // ── 煤 ──
  { keywords: ['煤层'], id: 185 },
  { keywords: ['煤'], id: 54 },
  // ── 灰岩类 ──
  { keywords: ['瘤状灰岩'], id: 55 },
  { keywords: ['薄层状灰岩'], id: 57 },
  { keywords: ['泥灰岩'], id: 59 },
  { keywords: ['生物灰岩', '生物礁灰岩'], id: 62 },
  { keywords: ['粗晶灰岩'], id: 63 },
  { keywords: ['中晶灰岩'], id: 64 },
  { keywords: ['细晶灰岩'], id: 65 },
  { keywords: ['粉晶灰岩'], id: 66 },
  { keywords: ['巨晶灰岩'], id: 67 },
  { keywords: ['不等晶灰岩'], id: 68 },
  { keywords: ['介壳灰岩'], id: 95 },
  { keywords: ['藻灰岩'], id: 132 },
  { keywords: ['沥青灰岩'], id: 83 },
  { keywords: ['硅质灰岩'], id: 86 },
  { keywords: ['云灰岩'], id: 131 },
  { keywords: ['石灰岩', '灰岩'], id: 58 },
  // ── 白云岩类 ──
  { keywords: ['成岩白云岩'], id: 60 },
  { keywords: ['细晶白云岩'], id: 71 },
  { keywords: ['中晶白云岩'], id: 72 },
  { keywords: ['粗晶白云岩'], id: 73 },
  { keywords: ['不等晶白云岩'], id: 70 },
  { keywords: ['灰质白云岩'], id: 135 },
  { keywords: ['泥质白云岩'], id: 136 },
  { keywords: ['砂质白云岩'], id: 137 },
  { keywords: ['含灰白云岩'], id: 134 },
  { keywords: ['沥青质白云岩'], id: 85 },
  { keywords: ['白云岩'], id: 74 },
  // ── �ite/盐/膏 ──
  { keywords: ['泥膏岩'], id: 191 },
  { keywords: ['石膏岩'], id: 194 },
  { keywords: ['石膏层'], id: 192 },
  { keywords: ['石膏'], id: 194 },
  { keywords: ['膏盐层'], id: 193 },
  { keywords: ['膏盐岩'], id: 211 },
  { keywords: ['岩盐'], id: 187 },
  { keywords: ['盐岩'], id: 190 },
  { keywords: ['钾盐'], id: 186 },
  { keywords: ['芒硝'], id: 189 },
  // ── 凝灰岩/火山岩 ──
  { keywords: ['凝灰质砂砾岩'], id: 56 },
  { keywords: ['晶屑凝灰岩'], id: 172 },
  { keywords: ['凝灰岩'], id: 184 },
  { keywords: ['火山角砾岩'], id: 175 },
  { keywords: ['集块岩'], id: 178 },
  { keywords: ['火山集块岩'], id: 301 },
  // ── 侵入岩/喷出岩 ──
  { keywords: ['安山玄武岩'], id: 224 },
  { keywords: ['玄武安山岩'], id: 245 },
  { keywords: ['玄武岩'], id: 223 },
  { keywords: ['安山岩'], id: 222 },
  { keywords: ['花岗岩'], id: 249 },
  { keywords: ['闪长岩'], id: 227 },
  { keywords: ['正长岩'], id: 228 },
  { keywords: ['辉绿岩'], id: 231 },
  { keywords: ['辉长岩'], id: 241 },
  { keywords: ['橄榄岩'], id: 240 },
  { keywords: ['流纹岩'], id: 255 },
  { keywords: ['斑岩'], id: 229 },
  { keywords: ['英安岩'], id: 220 },
  // ── 变质岩 ──
  { keywords: ['大理岩'], id: 258 },
  { keywords: ['石英片岩'], id: 265 },
  { keywords: ['片岩'], id: 264 },
  { keywords: ['片麻岩'], id: 274 },
  { keywords: ['千枚岩'], id: 268 },
  { keywords: ['板岩'], id: 271 },
  { keywords: ['蛇纹岩'], id: 263 },
  { keywords: ['石英岩'], id: 281 },
  { keywords: ['混合岩'], id: 282 },
  { keywords: ['变质岩'], id: 262 },
  { keywords: ['糜棱岩'], id: 273 },
  { keywords: ['碎裂岩'], id: 257 },
  // ── 矿/其他 ──
  { keywords: ['铝土岩'], id: 195 },
  { keywords: ['铁矿'], id: 196 },
  { keywords: ['黄铁矿'], id: 197 },
  { keywords: ['锰矿'], id: 198 },
  { keywords: ['磷块岩'], id: 199 },
  { keywords: ['硅质岩'], id: 215 },
  { keywords: ['基岩'], id: 219 },
  // ── 土/松散 ──
  { keywords: ['粘土'], id: 284 },
  { keywords: ['红土'], id: 288 },
  { keywords: ['泥炭'], id: 300 },
  { keywords: ['卵石'], id: 289 },
  { keywords: ['砾石'], id: 290 },
]

// ── Procedural tile drawing & Canvas pattern creation ──

const tileCache = new Map<number, HTMLCanvasElement>()
const patternCache = new Map<string, CanvasPattern | null>()

// Standard tile size: wide rectangle matching GB/T 958 proportions
const TW = 48 // tile width
const TH = 16 // tile height (~3:1 ratio)

/** Draw pattern primitives onto a small offscreen canvas */
function drawTile(id: number): HTMLCanvasElement {
  if (tileCache.has(id))
    return tileCache.get(id)!

  const drawer = TILE_DRAWERS[id] ?? getTileFallback(id)
  const canvas = document.createElement('canvas')
  canvas.width = drawer.w ?? TW
  canvas.height = drawer.h ?? TH
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawer.draw(ctx, canvas.width, canvas.height)
  tileCache.set(id, canvas)
  return canvas
}

// ── Primitive helpers ──

/** Fill rows of dots (solid circles) */
function dots(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, cols: number, rows: number, stagger = false) {
  ctx.fillStyle = '#000'
  const gx = w / cols
  const gy = h / rows
  for (let row = 0; row < rows; row++) {
    const ox = (stagger && row % 2 === 1) ? gx / 2 : 0
    for (let col = 0; col < cols; col++) {
      ctx.beginPath()
      ctx.arc(ox + gx / 2 + col * gx, gy / 2 + row * gy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Draw rows of hollow circles */
function circles(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, cols: number, rows: number, lw = 1.2) {
  ctx.strokeStyle = '#000'
  ctx.lineWidth = lw
  const gx = w / cols
  const gy = h / rows
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.beginPath()
      ctx.arc(gx / 2 + col * gx, gy / 2 + row * gy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/** Draw short horizontal dashes (泥岩 pattern) */
function dashes(ctx: CanvasRenderingContext2D, w: number, h: number, len: number, cols: number, rows: number, stagger = true) {
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  const gx = w / cols
  const gy = h / rows
  for (let row = 0; row < rows; row++) {
    const ox = (stagger && row % 2 === 1) ? gx / 2 : 0
    for (let col = 0; col < cols; col++) {
      const cx = ox + gx / 2 + col * gx
      const cy = gy / 2 + row * gy
      ctx.beginPath()
      ctx.moveTo(cx - len / 2, cy)
      ctx.lineTo(cx + len / 2, cy)
      ctx.stroke()
    }
  }
}

/** Draw horizontal lines across full width (页岩 pattern) */
function hlines(ctx: CanvasRenderingContext2D, _w: number, h: number, count: number, w = 0) {
  const actualW = w || _w
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 0.8
  const gap = h / (count + 1)
  for (let i = 1; i <= count; i++) {
    ctx.beginPath()
    ctx.moveTo(0, gap * i)
    ctx.lineTo(actualW, gap * i)
    ctx.stroke()
  }
}

/** Draw brick pattern (灰岩 base) */
function bricks(ctx: CanvasRenderingContext2D, w: number, h: number, cols: number, rows: number) {
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 0.8
  const bw = w / cols
  const bh = h / rows
  // horizontal lines
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * bh)
    ctx.lineTo(w, r * bh)
    ctx.stroke()
  }
  // vertical lines — staggered
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 1) ? bw / 2 : 0
    for (let c = 0; c <= cols; c++) {
      const x = offset + c * bw
      if (x > w) continue
      ctx.beginPath()
      ctx.moveTo(x, r * bh)
      ctx.lineTo(x, (r + 1) * bh)
      ctx.stroke()
    }
  }
}

/** Draw diagonal slash lines inside each brick (白云岩 modifier) */
function brickSlashes(ctx: CanvasRenderingContext2D, w: number, h: number, cols: number, rows: number) {
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 0.6
  const bw = w / cols
  const bh = h / rows
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 1) ? bw / 2 : 0
    for (let c = 0; c < cols; c++) {
      const x = offset + c * bw
      if (x + bw > w + bw / 2) continue
      // single diagonal in each brick
      ctx.beginPath()
      ctx.moveTo(x + bw * 0.25, r * bh + bh * 0.15)
      ctx.lineTo(x + bw * 0.75, r * bh + bh * 0.85)
      ctx.stroke()
    }
  }
}

/** Draw small triangles (角砾岩 pattern) */
function triangles(ctx: CanvasRenderingContext2D, w: number, h: number, size: number, cols: number, rows: number) {
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  const gx = w / cols
  const gy = h / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = gx / 2 + c * gx
      const cy = gy / 2 + r * gy
      ctx.beginPath()
      ctx.moveTo(cx, cy - size / 2)
      ctx.lineTo(cx - size / 2, cy + size / 2)
      ctx.lineTo(cx + size / 2, cy + size / 2)
      ctx.closePath()
      ctx.stroke()
    }
  }
}

/** Solid fill (煤) */
function solidFill(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
}

// ── Tile drawer registry ──
// Maps pattern ID → drawing function for the most common lithologies.
// Tiles not listed here get a category-based fallback.

interface TileDrawer {
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  w?: number // override tile width
  h?: number // override tile height
}

const TILE_DRAWERS: Record<number, TileDrawer> = {
  // ── 砾岩类 (conglomerates): hollow circles ──
  1: { w: 48, h: 24, draw: (c, w, h) => circles(c, w, h, 8, 2, 1) },       // 巨砾岩 — big circles
  2: { draw: (c, w, h) => circles(c, w, h, 3.5, 4, 2) },                     // 小砾岩 — small circles
  3: { w: 48, h: 24, draw: (c, w, h) => circles(c, w, h, 6, 3, 1) },        // 粗砾岩 — large circles
  4: { draw: (c, w, h) => circles(c, w, h, 4.5, 3, 2) },                     // 中砾岩
  5: { draw: (c, w, h) => circles(c, w, h, 3, 4, 2) },                       // 细砾岩
  6: { draw: (c, w, h) => triangles(c, w, h, 7, 3, 2) },                     // 角砾岩 — triangles
  7: { draw: (c, w, h) => circles(c, w, h, 4, 3, 2) },                       // 砾岩
  8: { draw(c, w, h) { // 砂砾岩: circles + dots mixed
    circles(c, w, h, 4, 3, 1)
    dots(c, w / 3, h / 2, 1.5, 2, 1)
    c.save(); c.translate(0, h / 2); dots(c, w, h / 2, 1.5, 3, 1); c.restore()
  }, w: 48, h: 24 },
  9: { draw(c, w, h) { // 泥砾岩: circles + dashes
    circles(c, w, h, 4, 3, 1)
    c.save(); c.translate(0, h / 2); dashes(c, w, h / 2, 6, 3, 1); c.restore()
  }, w: 48, h: 24 },

  // ── 砂岩类 (sandstones): solid dots ──
  10: { draw: (c, w, h) => dots(c, w, h, 2.5, 3, 2) },                       // 粗砂岩 — big dots
  11: { draw: (c, w, h) => dots(c, w, h, 2, 4, 2, true) },                   // 中砂岩
  12: { draw: (c, w, h) => dots(c, w, h, 1.8, 4, 2, true) },                 // 中-细砂岩
  13: { draw: (c, w, h) => dots(c, w, h, 1.5, 4, 2) },                       // 细砂岩 — small dots
  14: { draw: (c, w, h) => dots(c, w, h, 1.2, 5, 2, true) },                 // 粉-细砂岩
  15: { draw(c, w, h) { // 泥质粉砂岩: tiny dots + dashes
    dots(c, w, h / 2, 1, 4, 1)
    c.save(); c.translate(0, h / 2); dashes(c, w, h / 2, 5, 3, 1); c.restore()
  }, h: 24 },
  16: { draw: (c, w, h) => dots(c, w, h, 1.8, 4, 2, true) },                 // 砂岩 (generic)
  17: { draw(c, w, h) { // 长石中砂岩: dots + V marks
    dots(c, w, h, 2, 3, 2, true)
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    c.beginPath(); c.moveTo(w * 0.7, 2); c.lineTo(w * 0.75, h / 2 - 1); c.lineTo(w * 0.8, 2); c.stroke()
  } },
  18: { draw(c, w, h) { // 长石砂岩
    dots(c, w, h, 1.8, 4, 2, true)
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    c.beginPath(); c.moveTo(w * 0.7, 1); c.lineTo(w * 0.75, h / 2 - 1); c.lineTo(w * 0.8, 1); c.stroke()
  } },
  19: { draw: (c, w, h) => { dots(c, w, h, 2.5, 2, 1); dots(c, w, h / 2, 1.2, 4, 1); } }, // 不等粒砂岩
  20: { draw: (c, w, h) => { dots(c, w, h, 2.5, 2, 1); dots(c, w, h / 2, 1.2, 4, 1); } }, // 不等粒石英砂岩
  21: { draw: (c, w, h) => dots(c, w, h, 1.8, 4, 2) },                       // 石英砂岩
  22: { draw: (c, w, h) => dots(c, w, h, 1.8, 4, 2) },                       // 长石石英砂岩
  27: { draw: (c, w, h) => circles(c, w, h, 2.5, 4, 2) },                    // 鲕状砂岩 — oolitic
  28: { draw: (c, w, h) => dots(c, w, h, 0.8, 6, 3) },                       // 粉砂岩 — tiny dots
  29: { draw(c, w, h) { // 粉砂质泥岩
    dots(c, w, h / 2, 0.8, 5, 1)
    c.save(); c.translate(0, h / 2); dashes(c, w, h / 2, 5, 3, 1); c.restore()
  }, h: 24 },

  // ── 泥岩类 (mudstone): short dashes ──
  30: { draw: (c, w, h) => dashes(c, w, h, 6, 4, 2) },                       // 泥岩
  39: { draw(c, w, h) { // 含砾泥岩
    dashes(c, w, h, 6, 3, 2)
    circles(c, w, h, 3, 1, 1)
  }, w: 48, h: 24 },
  40: { draw(c, w, h) { dashes(c, w, h, 6, 4, 2); dots(c, w, h, 0.8, 2, 1) } }, // 碳质泥岩
  41: { draw(c, w, h) { // 白云质泥岩: dashes + slash
    dashes(c, w, h, 6, 4, 2)
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    c.beginPath(); c.moveTo(w * 0.8, 1); c.lineTo(w * 0.9, h - 1); c.stroke()
  } },
  44: { draw: (c, w, h) => dashes(c, w, h, 6, 4, 2) },                       // 沥青质泥岩
  45: { draw(c, w, h) { // 硅质泥岩: dashes + triangle
    dashes(c, w, h, 6, 3, 2)
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    c.beginPath(); c.moveTo(w * 0.85, 2); c.lineTo(w * 0.8, h - 2); c.lineTo(w * 0.9, h - 2); c.closePath(); c.stroke()
  } },
  46: { draw(c, w, h) { // 灰质泥岩: dashes + brick fragment
    dashes(c, w, h, 6, 3, 2)
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    c.strokeRect(w * 0.75, h * 0.2, w * 0.15, h * 0.6)
  } },

  // ── 页岩类 (shale): long horizontal lines ──
  31: { draw(c, w, h) { hlines(c, w, h, 3); dots(c, w, h, 1, 2, 1) } },     // 油页岩
  32: { draw: (c, w, h) => hlines(c, w, h, 3) },                              // 页岩
  33: { draw(c, w, h) { hlines(c, w, h, 2); dots(c, w, h, 1.5, 3, 1) } },   // 砂质页岩
  34: { draw(c, w, h) { hlines(c, w, h, 3); // 碳质页岩 — lines + stipple
    for (let i = 0; i < 6; i++) { c.fillStyle = '#000'; c.fillRect(3 + i * 8, 2, 1, 1) }
  } },
  35: { draw: (c, w, h) => hlines(c, w, h, 4) },                              // 沥青质页岩
  36: { draw(c, w, h) { hlines(c, w, h, 3); // 硅质页岩 — lines + V
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    c.beginPath(); c.moveTo(w * 0.4, 1); c.lineTo(w * 0.45, h * 0.3); c.lineTo(w * 0.5, 1); c.stroke()
  } },
  37: { draw(c, w, h) { hlines(c, w, h, 2); // 灰质页岩 — lines + brick
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    c.strokeRect(w * 0.3, h * 0.15, w * 0.2, h * 0.35)
  } },
  38: { draw: (c, w, h) => hlines(c, w, h, 3) },                              // 铝土质页岩

  // ── 煤 (coal): solid black ──
  54: { draw: (c, w, h) => solidFill(c, w, h) },
  185: { draw: (c, w, h) => solidFill(c, w, h) },

  // ── 灰岩类 (limestone): brick pattern ──
  55: { draw(c, w, h) { bricks(c, w, h, 3, 2); // 瘤状灰岩 — bricks + curves
    c.strokeStyle = '#000'; c.lineWidth = 0.5
    c.beginPath(); c.arc(w / 2, h / 2, 3, 0, Math.PI); c.stroke()
  }, h: 24 },
  57: { draw: (c, w, h) => bricks(c, w, h, 4, 3), h: 24 },                   // 薄层状灰岩
  58: { draw: (c, w, h) => bricks(c, w, h, 3, 2), h: 24 },                   // 石灰岩
  59: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 泥灰岩 — bricks + dashes
    dashes(c, w * 0.6, h * 0.4, 4, 2, 1)
  }, h: 24 },
  62: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 生物灰岩
    c.strokeStyle = '#000'; c.lineWidth = 0.5
    c.beginPath(); c.arc(w * 0.3, h * 0.5, 3, 0, Math.PI * 2); c.stroke()
  }, h: 24 },
  63: { draw: (c, w, h) => bricks(c, w, h, 2, 2), h: 24 },                   // 粗晶灰岩
  64: { draw: (c, w, h) => bricks(c, w, h, 3, 2), h: 24 },                   // 中晶灰岩
  65: { draw: (c, w, h) => bricks(c, w, h, 4, 2), h: 24 },                   // 细晶灰岩
  66: { draw: (c, w, h) => bricks(c, w, h, 4, 3), h: 24 },                   // 粉晶灰岩
  67: { draw: (c, w, h) => bricks(c, w, h, 2, 1), h: 24 },                   // 巨晶灰岩
  68: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 不等晶灰岩
    bricks(c, w * 0.5, h * 0.5, 2, 1)
  }, h: 24 },
  83: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 沥青灰岩 — darker
    dots(c, w, h, 1, 3, 2)
  }, h: 24 },
  86: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 硅质灰岩 — bricks + V
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    c.beginPath(); c.moveTo(w * 0.6, 2); c.lineTo(w * 0.65, h / 2); c.lineTo(w * 0.7, 2); c.stroke()
  }, h: 24 },
  87: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 白云质石灰岩 — bricks + slash
    brickSlashes(c, w * 0.5, h, 1, 2)
  }, h: 24 },
  95: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 介壳灰岩
    c.strokeStyle = '#000'; c.lineWidth = 0.5
    c.beginPath(); c.arc(w * 0.5, h * 0.4, 4, 0.3, Math.PI - 0.3); c.stroke()
  }, h: 24 },
  131: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 云灰岩
    brickSlashes(c, w, h, 3, 2)
  }, h: 24 },
  132: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 藻灰岩 — wavy
    c.strokeStyle = '#000'; c.lineWidth = 0.5
    c.beginPath()
    for (let x = 0; x < w; x += 2) { c.lineTo(x, h * 0.3 + Math.sin(x * 0.3) * 2) }
    c.stroke()
  }, h: 24 },

  // ── 白云岩类 (dolomite): brick + diagonal slashes ──
  60: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }, // 成岩白云岩
  61: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) // 泥云岩
    dashes(c, w * 0.3, h * 0.5, 4, 1, 1)
  }, h: 24 },
  70: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }, // 不等晶白云岩
  71: { draw(c, w, h) { bricks(c, w, h, 4, 2); brickSlashes(c, w, h, 4, 2) }, h: 24 }, // 细晶白云岩
  72: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }, // 中晶白云岩
  73: { draw(c, w, h) { bricks(c, w, h, 2, 2); brickSlashes(c, w, h, 2, 2) }, h: 24 }, // 粗晶白云岩
  74: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }, // 白云岩
  85: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2); dots(c, w, h, 1, 2, 1) }, h: 24 }, // 沥青质白云岩
  134: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }, // 含灰白云岩
  135: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }, // 灰质白云岩
  136: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) // 泥质白云岩
    dashes(c, w * 0.5, h * 0.3, 4, 2, 1)
  }, h: 24 },
  137: { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) // 砂质白云岩
    dots(c, w * 0.3, h * 0.3, 1, 2, 1)
  }, h: 24 },

  // ── 蒸发岩 (evaporites) ──
  186: { draw(c, w, h) { // 钾盐 — cross hatching
    c.strokeStyle = '#000'; c.lineWidth = 0.6
    for (let i = 0; i < w + h; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(0, i); c.stroke() }
    for (let i = 0; i < w + h; i += 6) { c.beginPath(); c.moveTo(w - i, 0); c.lineTo(w, i); c.stroke() }
  } },
  187: { draw(c, w, h) { bricks(c, w, h, 3, 2) }, h: 24 },                  // 岩盐
  190: { draw(c, w, h) { bricks(c, w, h, 3, 2) }, h: 24 },                  // 盐岩
  191: { draw(c, w, h) { dashes(c, w, h, 5, 3, 2) // 泥膏岩
    c.strokeStyle = '#000'; c.lineWidth = 0.5
    c.beginPath(); c.moveTo(w * 0.7, 1); c.lineTo(w * 0.85, h / 2); c.moveTo(w * 0.7, h / 2); c.lineTo(w * 0.85, 1); c.stroke()
  } },
  192: { draw(c, w, h) { // 石膏层 — X marks
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    const gx = w / 3; const gy = h / 2
    for (let r = 0; r < 2; r++) for (let cc = 0; cc < 3; cc++) {
      const cx = gx / 2 + cc * gx; const cy = gy / 2 + r * gy
      c.beginPath(); c.moveTo(cx - 3, cy - 3); c.lineTo(cx + 3, cy + 3); c.moveTo(cx + 3, cy - 3); c.lineTo(cx - 3, cy + 3); c.stroke()
    }
  } },
  194: { draw(c, w, h) { // 石膏岩 — X pattern sparse
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    c.beginPath()
    c.moveTo(w * 0.2, 2); c.lineTo(w * 0.35, h - 2)
    c.moveTo(w * 0.35, 2); c.lineTo(w * 0.2, h - 2)
    c.moveTo(w * 0.65, 2); c.lineTo(w * 0.8, h - 2)
    c.moveTo(w * 0.8, 2); c.lineTo(w * 0.65, h - 2)
    c.stroke()
  } },

  // ── 火成岩 (igneous) — V or + marks ──
  222: { draw(c, w, h) { // 安山岩 — plus marks
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    const draw_plus = (cx: number, cy: number, s: number) => {
      c.beginPath(); c.moveTo(cx - s, cy); c.lineTo(cx + s, cy); c.moveTo(cx, cy - s); c.lineTo(cx, cy + s); c.stroke()
    }
    draw_plus(w * 0.25, h * 0.5, 4)
    draw_plus(w * 0.75, h * 0.5, 4)
  } },
  223: { draw(c, w, h) { // 玄武岩 — V marks
    c.strokeStyle = '#000'; c.lineWidth = 1
    c.beginPath(); c.moveTo(w * 0.15, 2); c.lineTo(w * 0.25, h - 2); c.lineTo(w * 0.35, 2); c.stroke()
    c.beginPath(); c.moveTo(w * 0.55, 2); c.lineTo(w * 0.65, h - 2); c.lineTo(w * 0.75, 2); c.stroke()
  } },
  249: { draw(c, w, h) { // 花岗岩 — plus + dots
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    c.beginPath(); c.moveTo(w * 0.2, h * 0.5); c.lineTo(w * 0.4, h * 0.5); c.moveTo(w * 0.3, h * 0.2); c.lineTo(w * 0.3, h * 0.8); c.stroke()
    dots(c, w * 0.5, h, 1.5, 1, 1)
  } },
  231: { draw(c, w, h) { // 辉绿岩 — dense plus
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    const draw_plus = (cx: number, cy: number, s: number) => {
      c.beginPath(); c.moveTo(cx - s, cy); c.lineTo(cx + s, cy); c.moveTo(cx, cy - s); c.lineTo(cx, cy + s); c.stroke()
    }
    draw_plus(w * 0.25, h * 0.3, 3)
    draw_plus(w * 0.75, h * 0.7, 3)
  } },

  // ── 变质岩 (metamorphic) — wavy lines / crosses ──
  258: { draw(c, w, h) { bricks(c, w, h, 3, 2) // 大理岩 — bricks (like marble)
    c.strokeStyle = '#000'; c.lineWidth = 0.4
    c.beginPath()
    for (let x = 0; x < w; x += 2) { c.lineTo(x, h * 0.5 + Math.sin(x * 0.5) * 2) }
    c.stroke()
  }, h: 24 },
  264: { draw(c, w, h) { // 片岩 — wavy parallel lines
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    for (let line = 0; line < 3; line++) {
      c.beginPath()
      const baseY = (line + 1) * h / 4
      for (let x = 0; x < w; x += 1) { c.lineTo(x, baseY + Math.sin(x * 0.4 + line) * 1.5) }
      c.stroke()
    }
  } },
  271: { draw(c, w, h) { // 板岩 — straight parallel
    hlines(c, w, h, 4)
  } },
  274: { draw(c, w, h) { // 片麻岩 — wavy + dots
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    for (let line = 0; line < 2; line++) {
      c.beginPath()
      const baseY = (line + 1) * h / 3
      for (let x = 0; x < w; x += 1) { c.lineTo(x, baseY + Math.sin(x * 0.3 + line) * 2) }
      c.stroke()
    }
    dots(c, w, h, 1, 2, 1)
  } },

  // ── 松散沉积 (unconsolidated) ──
  284: { draw: (c, w, h) => dashes(c, w, h, 8, 3, 2) },  // 粘土 — long dashes
  288: { draw: (c, w, h) => dashes(c, w, h, 8, 3, 2) },  // 红土
  289: { draw: (c, w, h) => circles(c, w, h, 5, 3, 1), h: 24 }, // 卵石
  290: { draw: (c, w, h) => circles(c, w, h, 3.5, 3, 2) },      // 砾石
  300: { draw(c, w, h) { // 泥炭土 — dashes + organic marks
    dashes(c, w, h, 6, 3, 2)
    c.strokeStyle = '#000'; c.lineWidth = 0.5
    c.beginPath(); c.arc(w * 0.8, h * 0.5, 2, 0, Math.PI * 2); c.stroke()
  } },
}

/** Get a fallback drawer based on category for unlisted pattern IDs */
function getTileFallback(id: number): TileDrawer {
  // Conglomerates (1-9)
  if (id >= 1 && id <= 9) return { draw: (c, w, h) => circles(c, w, h, 4, 3, 2) }
  // Sandstones (10-27)
  if (id >= 10 && id <= 27) return { draw: (c, w, h) => dots(c, w, h, 1.5, 4, 2, true) }
  // Siltstone (28)
  if (id === 28) return { draw: (c, w, h) => dots(c, w, h, 0.8, 6, 3) }
  // Mudstones (29-30, 39-53)
  if (id === 29 || id === 30 || (id >= 39 && id <= 53)) return { draw: (c, w, h) => dashes(c, w, h, 6, 4, 2) }
  // Shales (31-38)
  if (id >= 31 && id <= 38) return { draw: (c, w, h) => hlines(c, w, h, 3) }
  // Coal
  if (id === 54 || id === 185) return { draw: (c, w, h) => solidFill(c, w, h) }
  // Limestones (55-132)
  if (id >= 55 && id <= 132) return { draw: (c, w, h) => bricks(c, w, h, 3, 2), h: 24 }
  // Dolomites (134-165)
  if (id >= 134 && id <= 165) return { draw(c, w, h) { bricks(c, w, h, 3, 2); brickSlashes(c, w, h, 3, 2) }, h: 24 }
  // Tuffaceous / Pyroclastics (166-184)
  if (id >= 166 && id <= 184) return { draw: (c, w, h) => triangles(c, w, h, 5, 3, 2) }
  // Evaporites (186-215)
  if (id >= 186 && id <= 215) return { draw: (c, w, h) => bricks(c, w, h, 3, 2), h: 24 }
  // Cataclastic (216-219)
  if (id >= 216 && id <= 219) return { draw: (c, w, h) => triangles(c, w, h, 6, 3, 2) }
  // Igneous (220-256)
  if (id >= 220 && id <= 256) return { draw(c, w, h) {
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    c.beginPath(); c.moveTo(w * 0.15, 2); c.lineTo(w * 0.25, h - 2); c.lineTo(w * 0.35, 2); c.stroke()
    c.beginPath(); c.moveTo(w * 0.55, 2); c.lineTo(w * 0.65, h - 2); c.lineTo(w * 0.75, 2); c.stroke()
  } }
  // Metamorphic (257-283)
  if (id >= 257 && id <= 283) return { draw(c, w, h) {
    c.strokeStyle = '#000'; c.lineWidth = 0.8
    for (let line = 0; line < 3; line++) {
      c.beginPath()
      for (let x = 0; x < w; x += 1) c.lineTo(x, (line + 1) * h / 4 + Math.sin(x * 0.4 + line) * 1.5)
      c.stroke()
    }
  } }
  // Unconsolidated (284-301)
  if (id >= 284 && id <= 301) return { draw: (c, w, h) => dots(c, w, h, 1.5, 4, 2) }
  // Generic fallback
  return { draw: (c, w, h) => dots(c, w, h, 1.5, 4, 2) }
}

/** Preload — now a no-op since tiles are drawn on demand (kept for API compat) */
export async function preloadLithologyTiles(): Promise<void> { /* procedural tiles, nothing to preload */ }

/** Match description text to pattern ID */
export function matchLithologyId(description: string): number | null {
  for (const entry of KEYWORD_TABLE) {
    if (entry.keywords.some(kw => description.includes(kw)))
      return entry.id
  }
  return null
}

/** Create a Canvas repeating pattern from procedurally-drawn tile */
export function createLithologyPattern(
  ctx: CanvasRenderingContext2D,
  patternId: number,
): CanvasPattern | null {
  const key = `tile_${patternId}`
  if (patternCache.has(key))
    return patternCache.get(key)!

  const tile = drawTile(patternId)
  const pattern = ctx.createPattern(tile, 'repeat')
  patternCache.set(key, pattern)
  return pattern
}

/** Clear pattern cache (call when canvas context changes) */
export function clearPatternCache(): void {
  patternCache.clear()
}

/** Get pattern name by ID */
export function getLithologyName(id: number): string {
  return LITHOLOGY_NAMES[id] ?? `未知(${id})`
}

/**
 * Get background color for a lithology pattern ID.
 * Different rock types get different gray shades so the column shows
 * clear visual contrast (dark = fine-grained/argillaceous, light = coarse/arenaceous).
 */
export function getLithologyBgColor(patternId: number | null): string {
  if (patternId === null) return '#E0E0E0'

  // 砾岩类 (conglomerates) — light
  if (patternId >= 1 && patternId <= 9) return '#D8D0C0'
  // 砂岩类 (sandstones) — light cream
  if (patternId >= 10 && patternId <= 27) return '#D8D0C0'
  // 粉砂岩 (siltstone)
  if (patternId === 28) return '#C8C0B8'
  // 粉砂质泥岩
  if (patternId === 29 || patternId === 15) return '#B8B0A8'
  // 泥岩类 (mudstone) — dark
  if (patternId === 30 || (patternId >= 39 && patternId <= 53)) return '#A0A0A0'
  // 页岩类 (shale) — very dark
  if (patternId >= 31 && patternId <= 38) return '#888888'
  // 煤 (coal) — near black
  if (patternId === 54 || patternId === 185) return '#505050'
  // 灰岩类 (limestones) — blue-gray
  if (patternId >= 55 && patternId <= 132) return '#C8C8D0'
  // 沉凝灰岩 etc.
  if (patternId === 133) return '#B8B8C0'
  // 白云岩类 (dolomites) — purple-gray
  if (patternId >= 134 && patternId <= 165) return '#C0B8C8'
  // 凝灰质沉积 (tuffaceous) — medium
  if (patternId >= 166 && patternId <= 171) return '#B0A8A0'
  // 凝灰岩/火山碎屑岩 (pyroclastics)
  if (patternId >= 172 && patternId <= 184) return '#A8A098'
  // 蒸发岩 (evaporites: salt, gypsum)
  if (patternId >= 186 && patternId <= 215) return '#D8D8D8'
  // 构造岩 (cataclastic)
  if (patternId >= 216 && patternId <= 219) return '#B8B0A8'
  // 火成岩 (igneous)
  if (patternId >= 220 && patternId <= 256) return '#A8A098'
  // 变质岩 (metamorphic)
  if (patternId >= 257 && patternId <= 283) return '#B0A8A8'
  // 松散沉积 (unconsolidated)
  if (patternId >= 284 && patternId <= 301) return '#C8C0B0'

  return '#D0D0D0'
}
