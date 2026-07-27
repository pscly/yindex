import { round } from "./extension.perf-lifecycle.helpers"

export const WALLPAPER_JS_WINDOW_MS = 10_000

export function nearestRankPercentile(
  values: readonly number[],
  percentile: number,
): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const rank = Math.ceil(percentile * sorted.length)
  const value = sorted[Math.max(0, Math.min(rank - 1, sorted.length - 1))]
  return value === undefined ? null : round(value)
}

export function isMateriallyMonotonic(
  values: readonly number[],
  minimumStep: number,
): boolean {
  if (values.length < 2) return false
  return values
    .slice(1)
    .every((value, index) => value - (values[index] ?? value) >= minimumStep)
}
