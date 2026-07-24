import type { HomeDocument } from "@yindex/domain"
import type { GestureSnapshot } from "./pageTurnGestureTypes"
import {
  clampIndexToSequence,
  idleAt,
  resolveInitialIndex,
  sequenceIdentityKey,
} from "./pageTurnNav"
import type { SpringState } from "./pageTurnSpring"

export type DocSyncState = {
  readonly initialized: boolean
  readonly lastSeqKey: string
  readonly generation: number
  readonly index: number
  readonly gesture: GestureSnapshot
  readonly spring: SpringState
  readonly indexChanged: boolean
  readonly invalidated: boolean
}

/**
 * Apply Home document / sequence changes to page-turn runtime state.
 * Invalidates springs when sequence identity, index, or pageCount<=1 changes.
 */
export function syncPageTurnDocument(input: {
  readonly doc: HomeDocument
  readonly pageCount: number
  readonly currentIndex: number
  readonly initialized: boolean
  readonly lastSeqKey: string
  readonly generation: number
  readonly gesture: GestureSnapshot
}): DocSyncState {
  const seqKey = sequenceIdentityKey(input.doc.sequence.pageIds)
  if (!input.initialized) {
    const idx = resolveInitialIndex(input.doc)
    return {
      initialized: true,
      lastSeqKey: seqKey,
      generation: input.generation,
      index: idx,
      gesture: idleAt(idx),
      spring: { x: 0, v: 0 },
      indexChanged: true,
      invalidated: false,
    }
  }

  const next = clampIndexToSequence(input.currentIndex, input.pageCount)
  const seqChanged = seqKey !== input.lastSeqKey
  const indexChanged = next !== input.currentIndex
  const nonIdle = input.gesture.phase !== "idle" || input.gesture.progress !== 0
  // Force idle when one-page Home still holds a stale tracking/settling gesture.
  const singlePageStale = input.pageCount <= 1 && nonIdle
  if (seqChanged || indexChanged || singlePageStale) {
    return {
      initialized: true,
      lastSeqKey: seqKey,
      generation: input.generation + 1,
      index: next,
      gesture: idleAt(next),
      spring: { x: 0, v: 0 },
      indexChanged,
      invalidated: true,
    }
  }
  return {
    initialized: true,
    lastSeqKey: seqKey,
    generation: input.generation,
    index: input.currentIndex,
    gesture: input.gesture,
    spring: { x: 0, v: 0 },
    indexChanged: false,
    invalidated: false,
  }
}

export function makeGenerationGuard(
  generationRef: { current: number },
  gen: number,
): () => boolean {
  return () => gen === generationRef.current
}
