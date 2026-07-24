import { MIN_TEXT_CONTRAST, clamp, contrastRatio } from "./adaptiveContrast"

export type AdaptivePolarity = "dark-on-light" | "light-on-dark"

/** WidgetSurface variant family this branch serves. */
export type AdaptiveSurfaceKind = "lens" | "content-direct"

export type PolarityCandidate = {
  readonly polarity: AdaptivePolarity
  readonly fgL: number
  /** Seed muted L; final muted is floor-protected after bg is known. */
  readonly mutedL: number
  readonly tintL: number
  readonly scrimL: number
}

export type ScoredPolarity = {
  readonly polarity: AdaptivePolarity
  readonly fgL: number
  readonly mutedL: number
  readonly tintL: number
  readonly scrimL: number
  readonly tintOpacity: number
  readonly scrimOpacity: number
  readonly effectiveBackgroundL: number
  readonly contrastRatio: number
  readonly mutedContrastRatio: number
}

const DARK_FG_L = 0.12
const LIGHT_FG_L = 0.97
const DARK_TINT_L = 0.16
const LIGHT_TINT_L = 0.94
const DARK_SCRIM_L = 0.08
const LIGHT_SCRIM_L = 0.98

/**
 * Lens: deep tint + light text on bright Wallpaper; light tint + dark text on dark.
 * Tint L is inverted vs content-direct so glass can be a deep shell under light ink.
 */
export const LENS_CANDIDATES: readonly PolarityCandidate[] = [
  {
    polarity: "light-on-dark",
    fgL: LIGHT_FG_L,
    mutedL: 0.9,
    tintL: DARK_TINT_L,
    scrimL: DARK_SCRIM_L,
  },
  {
    polarity: "dark-on-light",
    fgL: DARK_FG_L,
    mutedL: 0.22,
    tintL: LIGHT_TINT_L,
    scrimL: LIGHT_SCRIM_L,
  },
] as const

/**
 * Content-direct: dark text on bright Wallpaper, light text on dark — no shell tint.
 * Soft scrim protects contrast; tint opacity stays near zero.
 */
export const CONTENT_DIRECT_CANDIDATES: readonly PolarityCandidate[] = [
  {
    polarity: "dark-on-light",
    fgL: DARK_FG_L,
    mutedL: 0.22,
    tintL: LIGHT_TINT_L,
    scrimL: LIGHT_SCRIM_L,
  },
  {
    polarity: "light-on-dark",
    fgL: LIGHT_FG_L,
    mutedL: 0.9,
    tintL: DARK_TINT_L,
    scrimL: DARK_SCRIM_L,
  },
] as const

/** @deprecated Prefer LENS_CANDIDATES / CONTENT_DIRECT_CANDIDATES. */
export const POLARITY_CANDIDATES = CONTENT_DIRECT_CANDIDATES

export function preferredPolarity(
  kind: AdaptiveSurfaceKind,
  wallpaperL: number,
  threshold: number,
): AdaptivePolarity {
  const bright = wallpaperL >= threshold
  switch (kind) {
    case "lens":
      // DESIGN Adaptive Glass: bright → deep tint + light text
      return bright ? "light-on-dark" : "dark-on-light"
    case "content-direct":
      // DESIGN Content-direct: bright → dark text
      return bright ? "dark-on-light" : "light-on-dark"
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function candidatesFor(
  kind: AdaptiveSurfaceKind,
): readonly PolarityCandidate[] {
  switch (kind) {
    case "lens":
      return LENS_CANDIDATES
    case "content-direct":
      return CONTENT_DIRECT_CANDIDATES
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

/**
 * Pull muted L toward primary until contrast(muted, bg) >= floor.
 * Hierarchy stays via slightly reduced chroma at CSS emit time, not opacity.
 */
export function floorMutedL(
  fgL: number,
  bgL: number,
  seedMutedL: number,
): number {
  if (contrastRatio(seedMutedL, bgL) >= MIN_TEXT_CONTRAST) {
    return clamp(seedMutedL, 0, 1)
  }
  // t=0 at seed, t=1 at fg — find minimal t that meets the floor.
  let lo = 0
  let hi = 1
  let bestT = 1
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    const candidate = seedMutedL + mid * (fgL - seedMutedL)
    if (contrastRatio(candidate, bgL) >= MIN_TEXT_CONTRAST) {
      bestT = mid
      hi = mid
    } else {
      lo = mid
    }
  }
  const muted = seedMutedL + bestT * (fgL - seedMutedL)
  if (contrastRatio(muted, bgL) < MIN_TEXT_CONTRAST) return fgL
  return clamp(muted, 0, 1)
}

export function pickPolarity(
  preferred: AdaptivePolarity,
  scored: readonly ScoredPolarity[],
): ScoredPolarity {
  const preferredScore = scored.find((s) => s.polarity === preferred)
  const altScore = scored.find((s) => s.polarity !== preferred)
  if (!preferredScore || !altScore) {
    throw new Error("adaptive glass polarity candidates incomplete")
  }
  if (
    preferredScore.contrastRatio < MIN_TEXT_CONTRAST &&
    altScore.contrastRatio > preferredScore.contrastRatio
  ) {
    return altScore
  }
  if (
    preferredScore.contrastRatio >= MIN_TEXT_CONTRAST &&
    altScore.contrastRatio > preferredScore.contrastRatio + 1.5
  ) {
    return altScore
  }
  return preferredScore
}
