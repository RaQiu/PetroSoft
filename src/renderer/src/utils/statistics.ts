export interface HistogramBin {
  min: number
  max: number
  count: number
}

export interface StatsResult {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  count: number
}

export function computeHistogram(values: number[], bins: number): HistogramBin[] {
  if (values.length === 0 || bins <= 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return [{ min, max, count: values.length }]
  }

  const binWidth = (max - min) / bins
  const result: HistogramBin[] = []

  for (let i = 0; i < bins; i++) {
    result.push({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      count: 0
    })
  }

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth)
    if (idx >= bins) idx = bins - 1
    result[idx].count++
  }

  return result
}

export function computeStats(values: number[]): StatsResult {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)
  const mean = sum / n

  const median =
    n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]

  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    count: n
  }
}
