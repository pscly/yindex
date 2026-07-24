import {
  type HomeDocument,
  type PageSequence,
  adjacentIndex,
  indexOfPage,
  resolveOpenPageId,
} from "@yindex/domain"
import { createIdleGesture, enterCooldown } from "./pageTurnGesturePublic"
import type { GestureSnapshot } from "./pageTurnGestureTypes"
import { createReducedFadeGesture } from "./pageTurnHost"

export function resolveInitialIndex(doc: HomeDocument): number {
  const openId = resolveOpenPageId(doc.sequence, {
    rememberLastPage: doc.settings.rememberLastPage,
    lastPageId: doc.lastPageId,
  })
  const idxR = indexOfPage(doc.sequence, openId)
  return idxR.ok ? idxR.value : 0
}

export function clampIndexToSequence(index: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  if (index >= pageCount) return pageCount - 1
  if (index < 0) return 0
  return index
}

export function adjacentOrSame(
  sequence: PageSequence,
  index: number,
  delta: number,
): number | null {
  const nextR = adjacentIndex(sequence, index, delta)
  return nextR.ok ? nextR.value : null
}

export function idleAt(index: number, now = 0): GestureSnapshot {
  return createIdleGesture(index, now)
}

export type GoToPlan =
  | { readonly kind: "noop" }
  | { readonly kind: "reduced_fade"; readonly gesture: GestureSnapshot }
  | {
      readonly kind: "snap"
      readonly index: number
      readonly gesture: GestureSnapshot
    }

export function planGoToIndex(input: {
  readonly index: number
  readonly pageCount: number
  readonly currentIndex: number
  readonly phase: GestureSnapshot["phase"]
  readonly reducedMotion: boolean
  readonly now: number
}): GoToPlan {
  const { index, pageCount, currentIndex, reducedMotion, now } = input
  if (pageCount <= 1) return { kind: "noop" }
  if (index < 0 || index >= pageCount) return { kind: "noop" }
  // Same-index is always a no-op regardless of tracking/settling phase.
  if (index === currentIndex) return { kind: "noop" }
  if (reducedMotion) {
    return {
      kind: "reduced_fade",
      gesture: createReducedFadeGesture(currentIndex, index, now, pageCount),
    }
  }
  return {
    kind: "snap",
    index,
    gesture: enterCooldown(idleAt(index, now), index, now),
  }
}

export function planGoBySettle(input: {
  readonly sequence: PageSequence
  readonly currentIndex: number
  readonly delta: number
  readonly gesture: GestureSnapshot
  readonly now: number
}): {
  readonly targetIndex: number
  readonly dir: 1 | -1
  readonly gesture: GestureSnapshot
  readonly springX: number
} | null {
  if (input.sequence.pageIds.length <= 1) return null
  if (input.delta === 0) return null
  const next = adjacentOrSame(input.sequence, input.currentIndex, input.delta)
  if (next === null || next === input.currentIndex) return null
  const dir: 1 | -1 = input.delta > 0 ? 1 : -1
  return {
    targetIndex: next,
    dir,
    springX: input.gesture.progress,
    gesture: {
      ...input.gesture,
      phase: "settling",
      baseIndex: input.currentIndex,
      settleTarget: dir,
      targetIndex: next,
      lockedDir: dir,
      lastSampleAt: input.now,
    },
  }
}

/** Document identity key for generation invalidation. */
export function sequenceIdentityKey(
  pageIds: readonly string[] | undefined,
): string {
  if (!pageIds || pageIds.length === 0) return ""
  return pageIds.join("\0")
}
