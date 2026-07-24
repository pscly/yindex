import { type Result, err, ok } from "../result/result"
import { clamp, oklch } from "./adaptiveContrast"
import {
  type AdaptivePolarity,
  type AdaptiveSurfaceKind,
  type ScoredPolarity,
  candidatesFor,
  pickPolarity,
  preferredPolarity,
} from "./adaptivePolarity"
import {
  type AdaptiveScoringContext,
  scorePolarityCandidate,
} from "./adaptiveScoring"
import {
  GLASS_PROFILE_BANDS,
  type GlassProfile,
  type GlassTuning,
  type ResolvedGlass,
  clampGlassProfileTokens,
} from "./glass"
import { composeGlassBeforeProfileClamp } from "./glassInternals"

export { MIN_TEXT_CONTRAST, contrastRatio } from "./adaptiveContrast"
export type { AdaptivePolarity, AdaptiveSurfaceKind } from "./adaptivePolarity"

/**
 * Temporal smoothing / hysteresis of Wallpaper samples belongs to the analyzer
 * or host before input reaches this module. This solver is stateless: identical
 * AdaptiveGlassInput always yields identical AdaptiveResolvedGlass. Do not add
 * hidden frame history here.
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

/** CSS-ready tokens for one WidgetSurface variant (lens | content-direct). */
export type AdaptiveSurfaceTokens = {
  readonly polarity: AdaptivePolarity
  readonly foregroundL: number
  readonly mutedL: number
  readonly effectiveBackgroundL: number
  readonly contrastRatio: number
  readonly mutedContrastRatio: number
  readonly foreground: string
  readonly mutedForeground: string
  readonly tint: string
  readonly tintOpacity: number
  readonly scrim: string
  readonly scrimOpacity: number
}

/**
 * Adaptive material: shared analysis + per-surface branches.
 * Top-level foreground/tint/scrim mirror `lens` so StyleTokens.glass stays
 * backward-coherent for consumers that have not yet selected a variant.
 */
export type AdaptiveGlassMaterial = {
  readonly analysis: AdaptiveGlassInput
  readonly usedFallback: boolean
  readonly lens: AdaptiveSurfaceTokens
  readonly contentDirect: AdaptiveSurfaceTokens
  /** @deprecated Prefer `lens` — aliases lens for base StyleTokens fields. */
  readonly polarity: AdaptivePolarity
  readonly foregroundL: number
  readonly effectiveBackgroundL: number
  readonly contrastRatio: number
  readonly foreground: string
  readonly mutedForeground: string
  readonly tint: string
  readonly tintOpacity: number
  readonly scrim: string
  readonly scrimOpacity: number
}

export type AdaptiveResolvedGlass = ResolvedGlass & {
  readonly adaptive: AdaptiveGlassMaterial
}

export type SolveAdaptiveGlassArgs = {
  readonly profile: GlassProfile
  readonly tuning: GlassTuning
  readonly analysis: AdaptiveGlassInput | null | undefined
}

const UNIT_MIN = 0
const UNIT_MAX = 1
const POLARITY_THRESHOLD = 0.48

function inUnit(value: number): boolean {
  return Number.isFinite(value) && value >= UNIT_MIN && value <= UNIT_MAX
}

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
function resolveAnalysis(analysis: AdaptiveGlassInput | null | undefined): {
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

function toSurfaceTokens(chosen: ScoredPolarity): AdaptiveSurfaceTokens {
  // Muted hierarchy: same L floor as primary, slightly lower chroma (not opacity).
  return {
    polarity: chosen.polarity,
    foregroundL: chosen.fgL,
    mutedL: chosen.mutedL,
    effectiveBackgroundL: chosen.effectiveBackgroundL,
    contrastRatio: chosen.contrastRatio,
    mutedContrastRatio: chosen.mutedContrastRatio,
    foreground: oklch(chosen.fgL, 0.02, 250),
    mutedForeground: oklch(chosen.mutedL, 0.012, 250),
    tint: oklch(chosen.tintL, 0.02, 250, chosen.tintOpacity),
    tintOpacity: chosen.tintOpacity,
    scrim: oklch(chosen.scrimL, 0.01, 250, chosen.scrimOpacity),
    scrimOpacity: chosen.scrimOpacity,
  }
}

function solveSurface(
  kind: AdaptiveSurfaceKind,
  context: AdaptiveScoringContext,
): AdaptiveSurfaceTokens {
  const preferred = preferredPolarity(
    kind,
    context.wallpaperL,
    POLARITY_THRESHOLD,
  )
  const scored = candidatesFor(kind).map((c) =>
    scorePolarityCandidate(c, kind, context),
  )
  return toSurfaceTokens(pickPolarity(preferred, scored))
}

/**
 * Public Adaptive Glass solver. Always returns finite CSS-ready material.
 * Invalid analysis falls back to BALANCED_SAFE_ANALYSIS (usedFallback=true).
 */
export function solveAdaptiveGlass(
  args: SolveAdaptiveGlassArgs,
): AdaptiveResolvedGlass {
  const composition = composeGlassBeforeProfileClamp(args.profile, args.tuning)
  const { input, usedFallback } = resolveAnalysis(args.analysis)
  const band = GLASS_PROFILE_BANDS[args.profile]

  const detailBoost = input.detail
  const chromaBoost = input.chroma * 0.25
  const adaptiveBlurPx = composition.blurPxBeforeProfileClamp + detailBoost * 10
  const tintBase = clamp(
    composition.tintOpacityBeforeProfileClamp +
      detailBoost * 0.1 +
      chromaBoost * 0.05,
    0.08,
    0.55,
  )
  const scoringContext: AdaptiveScoringContext = {
    wallpaperL: input.luminance,
    tintBase,
    detailBoost,
    lensTintOpacity: band.tintOpacity,
  }

  const lens = solveSurface("lens", scoringContext)
  const contentDirect = solveSurface("content-direct", scoringContext)

  const surfaceOpacity = clamp(
    Math.max(
      composition.tintOpacityBeforeProfileClamp,
      lens.tintOpacity + detailBoost * 0.08,
    ),
    0.05,
    0.7,
  )
  const bounded = clampGlassProfileTokens(args.profile, {
    blurPx: adaptiveBlurPx,
    tintOpacity: surfaceOpacity,
  })

  const adaptive: AdaptiveGlassMaterial = {
    analysis: input,
    usedFallback,
    lens,
    contentDirect,
    polarity: lens.polarity,
    foregroundL: lens.foregroundL,
    effectiveBackgroundL: lens.effectiveBackgroundL,
    contrastRatio: lens.contrastRatio,
    foreground: lens.foreground,
    mutedForeground: lens.mutedForeground,
    tint: lens.tint,
    tintOpacity: lens.tintOpacity,
    scrim: lens.scrim,
    scrimOpacity: lens.scrimOpacity,
  }

  return {
    profile: composition.profile,
    blurPx: bounded.blurPx,
    opacity: bounded.tintOpacity,
    highlight: composition.highlight,
    saturation: composition.saturation,
    enabled: true,
    tuning: composition.tuning,
    adaptive,
  }
}

export function resolveGlassWithAdaptive(
  profile: GlassProfile,
  tuning: GlassTuning,
  analysis?: AdaptiveGlassInput | null,
): AdaptiveResolvedGlass {
  return solveAdaptiveGlass({ profile, tuning, analysis: analysis ?? null })
}
