import { type Result, err, ok } from "../result/result"

/**
 * Temporal smoothing / hysteresis of Wallpaper samples belongs to the analyzer
 * or host before input reaches Adaptive Glass. This input boundary is
 * stateless: identical AdaptiveGlassInput always yields the same parse result.
 */
export const BALANCED_SAFE_ANALYSIS = {
  luminance: 0.32,
  chroma: 0.08,
  detail: 0.25,
} as const

export type AdaptiveGlassInput = {
  readonly luminance: number
  readonly chroma: number
  readonly detail: number
}

export type AdaptiveGlassParseError = {
  readonly code: "invalid_luminance" | "invalid_chroma" | "invalid_detail"
  readonly message: string
}

const UNIT_MIN = 0
const UNIT_MAX = 1

function inUnit(value: number): boolean {
  return Number.isFinite(value) && value >= UNIT_MIN && value <= UNIT_MAX
}

/**
 * Exact-once snapshot of accessor-backed structural analysis objects, then
 * finite unit-range validation. Callers must not re-read raw getters.
 */
export function parseAdaptiveGlassInput(raw: {
  readonly luminance: number
  readonly chroma: number
  readonly detail: number
}): Result<AdaptiveGlassInput, AdaptiveGlassParseError> {
  const luminance = raw.luminance
  const chroma = raw.chroma
  const detail = raw.detail
  if (!inUnit(luminance)) {
    return err({
      code: "invalid_luminance",
      message: `luminance must be in [${UNIT_MIN}, ${UNIT_MAX}]`,
    })
  }
  if (!inUnit(chroma)) {
    return err({
      code: "invalid_chroma",
      message: `chroma must be in [${UNIT_MIN}, ${UNIT_MAX}]`,
    })
  }
  if (!inUnit(detail)) {
    return err({
      code: "invalid_detail",
      message: `detail must be in [${UNIT_MIN}, ${UNIT_MAX}]`,
    })
  }
  return ok({
    luminance,
    chroma,
    detail,
  })
}

/**
 * Trust boundary: null/undefined → balanced-safe fallback.
 * Non-finite or out-of-range channels also fall back (never emit NaN material).
 */
export function resolveAdaptiveAnalysis(
  analysis: AdaptiveGlassInput | null | undefined,
): {
  readonly input: AdaptiveGlassInput
  readonly usedFallback: boolean
} {
  if (analysis === null || analysis === undefined) {
    return { input: BALANCED_SAFE_ANALYSIS, usedFallback: true }
  }
  const parsed = parseAdaptiveGlassInput(analysis)
  if (!parsed.ok) {
    return { input: BALANCED_SAFE_ANALYSIS, usedFallback: true }
  }
  return { input: parsed.value, usedFallback: false }
}
