import { progressSpanPx } from "./pageTurnGesture"

export const HARNESS_VH = 1000
export const HARNESS_SPAN = progressSpanPx(HARNESS_VH)
export const HARNESS_PAGE_COUNT = 3

export type HarnessFrame = {
  readonly t: number
  readonly progress: number
  readonly index: number
  readonly phase: string
  readonly overshoot: boolean
  readonly parallax: number
}

export function logSection(section: string, rows: readonly unknown[]): void {
  console.log(`\n## ${section}`)
  for (const r of rows) console.log(JSON.stringify(r))
}

export function gestureOpts(
  reducedMotion: boolean,
  pageCount = HARNESS_PAGE_COUNT,
): {
  readonly viewportHeight: number
  readonly pageCount: number
  readonly reducedMotion: boolean
} {
  return {
    viewportHeight: HARNESS_VH,
    pageCount,
    reducedMotion,
  }
}

export function blankStripVh(
  baseIndex: number,
  progress: number,
  pageCount: number,
): number {
  const slots = pageCount <= 1 ? Math.max(pageCount, 0) : pageCount + 2
  if (slots <= 0) return 0
  const p = Number.isFinite(progress) ? Math.max(-1, Math.min(1, progress)) : 0
  const stripFrac = -(baseIndex + 1 + p) / slots
  const stripVh = stripFrac * 100 * slots
  const blankTop = Math.max(0, stripVh)
  const blankBottom = Math.max(0, 100 - (stripVh + slots * 100))
  return blankTop + blankBottom
}
