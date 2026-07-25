import type { MotionProfile } from "@yindex/domain"
import { PAGE_TURN_POLICY, parallaxMaxForProfile } from "./pageTurnPolicy"

export function wrapPageIndex(index: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  return ((index % pageCount) + pageCount) % pageCount
}

/** Finite strip slots including leading/trailing clones when Loop needs them. */
export function cyclicSlotCount(pageCount: number): number {
  if (pageCount <= 1) return Math.max(pageCount, 0)
  return pageCount + 2
}

/**
 * Signed page steps from `fromIndex` to `toIndex` on a Loop sequence.
 * Prefers the shorter direction; ties break forward.
 */
export function signedLoopSteps(
  fromIndex: number,
  toIndex: number,
  pageCount: number,
): number {
  if (pageCount <= 0) return 0
  if (fromIndex === toIndex) return 0
  const forward = (toIndex - fromIndex + pageCount) % pageCount
  const backward = (fromIndex - toIndex + pageCount) % pageCount
  if (forward === 0) return 0
  if (forward <= backward) return forward
  return -backward
}

/**
 * Strip translate as fraction of strip height.
 * progress: signed toward next(+)/prev(-) from baseIndex.
 * When pageCount >= 2 the strip is projected as [clone_last, ...pages, clone_first]
 * so last→first / first→last stay continuous without blank space.
 */
export function stripOffsetFraction(
  baseIndex: number,
  progress: number,
  pageCount: number,
): number {
  if (pageCount <= 0) return 0
  if (pageCount === 1) return 0
  const slots = cyclicSlotCount(pageCount)
  // Real page i lives at slot i+1; progress ±1 moves one Page toward a neighbor/clone.
  const raw = -(baseIndex + 1 + progress) / slots
  return Object.is(raw, -0) ? 0 : raw
}

export function reducedMotionOffsetFraction(
  fromIndex: number,
  toIndex: number,
  t: number,
  pageCount: number,
): {
  readonly offset: number
  readonly opacityFrom: number
  readonly opacityTo: number
} {
  if (pageCount <= 0) {
    return { offset: 0, opacityFrom: 1, opacityTo: 0 }
  }
  if (pageCount === 1) {
    return { offset: 0, opacityFrom: 1, opacityTo: 0 }
  }
  const clampedT = Math.max(0, Math.min(1, t))
  const offset = stripOffsetFraction(fromIndex, 0, pageCount)
  return {
    offset: Object.is(offset, -0) ? 0 : offset,
    opacityFrom: 1 - clampedT,
    opacityTo: clampedT,
  }
}

export function reducedFadeT(now: number, startAt: number): number {
  const d = PAGE_TURN_POLICY.reducedMotionMs
  if (d <= 0) return 1
  return Math.max(0, Math.min(1, (now - startAt) / d))
}

/** Parallax as fraction of viewport; progress in [-1,1] */
export function parallaxOffset(progress: number, parallaxMax: number): number {
  if (!(parallaxMax > 0) || !Number.isFinite(progress)) return 0
  const p = Math.max(-1, Math.min(1, progress))
  return -p * parallaxMax
}

export function parallaxForProfile(
  progress: number,
  profile: MotionProfile,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0
  return parallaxOffset(progress, parallaxMaxForProfile(profile))
}
