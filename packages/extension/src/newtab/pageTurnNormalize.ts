/** DOM deltaMode: 0 pixel, 1 line, 2 page */
export type WheelDeltaInput = {
  readonly deltaY: number
  readonly deltaMode: number
  /** Used for page-mode deltas; defaults when missing/invalid */
  readonly viewportHeight?: number
}

const LINE_PX = 16
const DEFAULT_VIEWPORT = 800

/**
 * Normalize wheel deltaY to CSS pixels.
 * Malformed (NaN/±Inf) or unknown deltaMode → 0.
 * After line/page multiplication, non-finite output → 0.
 */
export function normalizeWheelDelta(input: WheelDeltaInput): number {
  const raw = input.deltaY
  if (!Number.isFinite(raw)) return 0

  const mode = input.deltaMode
  if (mode === 0 || mode === undefined) {
    return raw
  }
  if (mode === 1) {
    const out = raw * LINE_PX
    return Number.isFinite(out) ? out : 0
  }
  if (mode === 2) {
    const vh = input.viewportHeight
    const page =
      typeof vh === "number" && Number.isFinite(vh) && vh > 0
        ? vh
        : DEFAULT_VIEWPORT
    const out = raw * page
    return Number.isFinite(out) ? out : 0
  }
  return 0
}
