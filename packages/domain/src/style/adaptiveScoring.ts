import {
  MIN_TEXT_CONTRAST,
  clamp,
  contrastRatio,
  minOverlayForFloor,
  mixL,
} from "./adaptiveContrast"
import {
  type AdaptiveSurfaceKind,
  type PolarityCandidate,
  type ScoredPolarity,
  floorMutedL,
} from "./adaptivePolarity"

export type AdaptiveScoringContext = {
  readonly wallpaperL: number
  readonly tintBase: number
  readonly detailBoost: number
  readonly lensTintOpacity: {
    readonly min: number
    readonly max: number
  }
}

type UnfinalizedPolarityScore = {
  readonly fgL: number
  readonly tintOpacity: number
  readonly scrimOpacity: number
  readonly effectiveBackgroundL: number
  readonly contrastRatio: number
}

export function scorePolarityCandidate(
  c: PolarityCandidate,
  kind: AdaptiveSurfaceKind,
  context: AdaptiveScoringContext,
): ScoredPolarity {
  const { detailBoost, tintBase, wallpaperL } = context
  const tintOpacity =
    kind === "lens"
      ? clamp(
          tintBase * (0.55 + detailBoost * 0.35),
          context.lensTintOpacity.min,
          context.lensTintOpacity.max,
        )
      : clamp(tintBase * 0.04, 0, 0.06)

  const fieldL = mixL(wallpaperL, c.tintL, tintOpacity)
  let scrimOpacity = minOverlayForFloor(
    c.fgL,
    fieldL,
    c.scrimL,
    MIN_TEXT_CONTRAST,
  )
  scrimOpacity = Math.max(
    scrimOpacity,
    detailBoost * (kind === "lens" ? 0.1 : 0.08),
  )
  scrimOpacity = clamp(scrimOpacity, 0, kind === "lens" ? 0.85 : 0.55)

  let effectiveBackgroundL = mixL(fieldL, c.scrimL, scrimOpacity)
  let ratio = contrastRatio(c.fgL, effectiveBackgroundL)
  let fgL = c.fgL

  if (ratio < MIN_TEXT_CONTRAST) {
    scrimOpacity = clamp(
      minOverlayForFloor(c.fgL, fieldL, c.scrimL, MIN_TEXT_CONTRAST) + 0.02,
      0,
      0.95,
    )
    effectiveBackgroundL = mixL(fieldL, c.scrimL, scrimOpacity)
    ratio = contrastRatio(c.fgL, effectiveBackgroundL)
  }

  if (ratio < MIN_TEXT_CONTRAST) {
    fgL = c.polarity === "dark-on-light" ? 0.04 : 0.995
    if (kind === "lens") {
      const deeperTint = clamp(
        tintOpacity + 0.12,
        context.lensTintOpacity.min,
        context.lensTintOpacity.max,
      )
      const deeperField = mixL(wallpaperL, c.tintL, deeperTint)
      scrimOpacity = clamp(
        minOverlayForFloor(fgL, deeperField, c.scrimL, MIN_TEXT_CONTRAST) +
          0.02,
        0,
        0.98,
      )
      effectiveBackgroundL = mixL(deeperField, c.scrimL, scrimOpacity)
      ratio = contrastRatio(fgL, effectiveBackgroundL)
      return finalize(c, {
        fgL,
        tintOpacity: deeperTint,
        scrimOpacity,
        effectiveBackgroundL,
        contrastRatio: ratio,
      })
    }
    scrimOpacity = clamp(
      minOverlayForFloor(fgL, fieldL, c.scrimL, MIN_TEXT_CONTRAST) + 0.02,
      0,
      0.98,
    )
    effectiveBackgroundL = mixL(fieldL, c.scrimL, scrimOpacity)
    ratio = contrastRatio(fgL, effectiveBackgroundL)
  }

  if (ratio < MIN_TEXT_CONTRAST) {
    scrimOpacity = 1
    effectiveBackgroundL = c.scrimL
    ratio = contrastRatio(fgL, effectiveBackgroundL)
  }

  return finalize(c, {
    fgL,
    tintOpacity,
    scrimOpacity,
    effectiveBackgroundL,
    contrastRatio: ratio,
  })
}

function finalize(
  c: PolarityCandidate,
  score: UnfinalizedPolarityScore,
): ScoredPolarity {
  const mutedL = floorMutedL(score.fgL, score.effectiveBackgroundL, c.mutedL)
  return {
    polarity: c.polarity,
    fgL: score.fgL,
    mutedL,
    tintL: c.tintL,
    scrimL: c.scrimL,
    tintOpacity: score.tintOpacity,
    scrimOpacity: score.scrimOpacity,
    effectiveBackgroundL: score.effectiveBackgroundL,
    contrastRatio: score.contrastRatio,
    mutedContrastRatio: contrastRatio(mutedL, score.effectiveBackgroundL),
  }
}
