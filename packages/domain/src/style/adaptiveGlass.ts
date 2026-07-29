import { clamp, resolveSurfaceColorTokens } from "./adaptiveContrast"
import {
  type AdaptiveGlassInput,
  resolveAdaptiveAnalysis,
} from "./adaptiveInput"
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
export {
  BALANCED_SAFE_ANALYSIS,
  parseAdaptiveGlassInput,
} from "./adaptiveInput"
export type {
  AdaptiveGlassInput,
  AdaptiveGlassParseError,
} from "./adaptiveInput"

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

const POLARITY_THRESHOLD = 0.48

function toSurfaceTokens(
  kind: AdaptiveSurfaceKind,
  chosen: ScoredPolarity,
  wallpaperL: number,
): AdaptiveSurfaceTokens {
  const colors = {
    foregroundOklchL: chosen.fgL,
    mutedOklchL: chosen.mutedL,
    tintOklchL: chosen.tintL,
    tintOpacity: chosen.tintOpacity,
    scrimOklchL: chosen.scrimL,
    scrimOpacity: chosen.scrimOpacity,
  }
  switch (kind) {
    case "lens":
      return {
        polarity: chosen.polarity,
        ...resolveSurfaceColorTokens(colors, wallpaperL),
      }
    case "content-direct":
      return {
        polarity: chosen.polarity,
        ...resolveSurfaceColorTokens(colors, wallpaperL),
      }
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
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
  return toSurfaceTokens(
    kind,
    pickPolarity(preferred, scored),
    context.wallpaperL,
  )
}

/**
 * Public Adaptive Glass solver. Always returns finite CSS-ready material.
 * Invalid analysis falls back to BALANCED_SAFE_ANALYSIS (usedFallback=true).
 */
export function solveAdaptiveGlass(
  args: SolveAdaptiveGlassArgs,
): AdaptiveResolvedGlass {
  const composition = composeGlassBeforeProfileClamp(args.profile, args.tuning)
  const { input, usedFallback } = resolveAdaptiveAnalysis(args.analysis)
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
