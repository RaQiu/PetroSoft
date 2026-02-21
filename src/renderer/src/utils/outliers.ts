/**
 * Outlier removal algorithms for well log data.
 *
 * Well log curves often contain extreme values (e.g. -9999 null sentinels,
 * instrument spikes, washout effects) that distort histograms and crossplots.
 * These functions compute valid [min, max] bounds so that only the meaningful
 * portion of the data is visualised.
 */

export interface OutlierMethod {
  id: string
  label: string
  description: string
}

/** Available methods exposed to UI dropdowns. */
export const OUTLIER_METHODS: OutlierMethod[] = [
  { id: 'none', label: '不去除', description: '使用全部数据' },
  { id: 'iqr', label: 'IQR (四分位距)', description: 'Q1-1.5*IQR ~ Q3+1.5*IQR' },
  { id: 'iqr3', label: 'IQR x3 (宽松)', description: 'Q1-3*IQR ~ Q3+3*IQR，保留更多数据' },
  { id: 'percentile', label: '百分位截断', description: '去除最低1%和最高1%的数据' },
  { id: 'sigma2', label: '2-Sigma', description: '均值 ± 2倍标准差' },
  { id: 'sigma3', label: '3-Sigma', description: '均值 ± 3倍标准差' },
  { id: 'mad', label: 'MAD (中位数绝对偏差)', description: '基于中位数的稳健方法' }
]

/** Return value: the valid range [min, max] after outlier removal. */
export interface ClipRange {
  min: number
  max: number
}

// ── helpers ─────────────────────────────────────────────────────────

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

function quantile(sortedArr: number[], q: number): number {
  const pos = (sortedArr.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sortedArr[lo]
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (pos - lo)
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdDev(values: number[], avg: number): number {
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function median(sortedArr: number[]): number {
  const n = sortedArr.length
  if (n % 2 === 0) return (sortedArr[n / 2 - 1] + sortedArr[n / 2]) / 2
  return sortedArr[Math.floor(n / 2)]
}

// ── algorithms ──────────────────────────────────────────────────────

/** IQR method: Q1 - k*IQR  ~  Q3 + k*IQR */
function iqrRange(values: number[], k: number): ClipRange {
  const s = sorted(values)
  const q1 = quantile(s, 0.25)
  const q3 = quantile(s, 0.75)
  const iqr = q3 - q1
  return { min: q1 - k * iqr, max: q3 + k * iqr }
}

/** Percentile clipping: remove lowest p% and highest p%. */
function percentileRange(values: number[], p = 0.01): ClipRange {
  const s = sorted(values)
  return { min: quantile(s, p), max: quantile(s, 1 - p) }
}

/** N-sigma: mean ± n * stdDev */
function sigmaRange(values: number[], n: number): ClipRange {
  const avg = mean(values)
  const sd = stdDev(values, avg)
  return { min: avg - n * sd, max: avg + n * sd }
}

/** MAD: median ± k * MAD (k=3 by default, equivalent to ~99.7% for normal). */
function madRange(values: number[]): ClipRange {
  const s = sorted(values)
  const med = median(s)
  const absDevs = s.map((v) => Math.abs(v - med)).sort((a, b) => a - b)
  const mad = median(absDevs)
  // 1.4826 converts MAD to estimated sigma for normal distribution
  const threshold = 3 * 1.4826 * mad
  return { min: med - threshold, max: med + threshold }
}

// ── public API ──────────────────────────────────────────────────────

/**
 * Compute the valid [min, max] range for a given method.
 * Returns null only when method is 'none' (no clipping).
 */
export function computeClipRange(values: number[], method: string): ClipRange | null {
  if (values.length < 4) return null
  switch (method) {
    case 'none':
      return null
    case 'iqr':
      return iqrRange(values, 1.5)
    case 'iqr3':
      return iqrRange(values, 3)
    case 'percentile':
      return percentileRange(values, 0.01)
    case 'sigma2':
      return sigmaRange(values, 2)
    case 'sigma3':
      return sigmaRange(values, 3)
    case 'mad':
      return madRange(values)
    default:
      return null
  }
}

/**
 * Filter an array of numbers, keeping only values within the clip range.
 * If range is null (method='none'), returns the original array unchanged.
 */
export function clipValues(values: number[], range: ClipRange | null): number[] {
  if (!range) return values
  return values.filter((v) => v >= range.min && v <= range.max)
}
