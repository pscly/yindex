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
