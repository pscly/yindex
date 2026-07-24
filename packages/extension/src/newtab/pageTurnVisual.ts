import type { MotionProfile } from "@yindex/domain"
import type { GestureSnapshot } from "./pageTurnGestureTypes"
import {
  parallaxForProfile,
  reducedFadeT,
  reducedMotionOffsetFraction,
  stripOffsetFraction,
} from "./pageTurnLayout"

export type PageTurnVisual = {
  readonly offsetY: number
  readonly fadeOpacity: { readonly from: number; readonly to: number }
  readonly parallaxY: number
  readonly isTurning: boolean
  readonly isAnimating: boolean
}

export function computePageTurnVisual(input: {
  readonly gesture: GestureSnapshot
  readonly currentIndex: number
  readonly pageCount: number
  readonly motionProfile: MotionProfile
  readonly reducedMotion: boolean
  readonly nowMs: number
}): PageTurnVisual {
  const {
    gesture: g,
    currentIndex,
    pageCount,
    motionProfile,
    reducedMotion,
    nowMs,
  } = input

  // Public visual boundary: one-page (or empty) Home is always an idle no-op.
  if (pageCount <= 1) {
    return {
      offsetY: 0,
      fadeOpacity: { from: 1, to: 0 },
      parallaxY: 0,
      isTurning: false,
      isAnimating: false,
    }
  }

  let offsetFraction = stripOffsetFraction(currentIndex, 0, pageCount)
  let fadeOpacity = { from: 1, to: 0 }
  let isTurning = false
  let isAnimating = false

  if (g.phase === "reduced_fade") {
    const t = reducedFadeT(nowMs, g.reducedFadeStartAt)
    const r = reducedMotionOffsetFraction(
      g.reducedFadeFrom,
      g.reducedFadeTo,
      t,
      pageCount,
    )
    offsetFraction = r.offset
    fadeOpacity = { from: r.opacityFrom, to: r.opacityTo }
    isTurning = true
    isAnimating = true
  } else if (g.phase === "tracking" || g.phase === "settling") {
    offsetFraction = stripOffsetFraction(g.baseIndex, g.progress, pageCount)
    isTurning = true
    isAnimating = true
  } else {
    offsetFraction = stripOffsetFraction(currentIndex, 0, pageCount)
  }

  const progress =
    g.phase === "tracking" || g.phase === "settling" ? g.progress : 0

  return {
    offsetY: offsetFraction * 100,
    fadeOpacity,
    parallaxY: parallaxForProfile(progress, motionProfile, reducedMotion),
    isTurning,
    isAnimating,
  }
}
