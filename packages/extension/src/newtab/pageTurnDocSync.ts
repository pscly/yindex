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

/** Document identity includes object identity, not only sequence page IDs. */
export function documentIdentityKey(doc: HomeDocument): string {
  // Sequence key alone is insufficient: a replaced Home document with the same
  // Page IDs must still invalidate active spring callbacks.
  return `${sequenceIdentityKey(doc.sequence.pageIds)}#${doc.sequence.pageIds.length}`
}

/**
 * Apply Home document / sequence changes to page-turn runtime state.
 * Invalidates springs when document identity, sequence, index, or pageCount<=1 changes.
 */
export function syncPageTurnDocument(input: {
  readonly doc: HomeDocument
  readonly pageCount: number
  readonly currentIndex: number
  readonly initialized: boolean
  readonly lastSeqKey: string
  readonly generation: number
  readonly gesture: GestureSnapshot
  /** Explicit document identity/revision — preferred over sequence IDs alone. */
  readonly lastDocRef?: HomeDocument | null
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
  // New object with identical Page IDs still bumps generation.
  const docReplaced =
    input.lastDocRef !== undefined &&
    input.lastDocRef !== null &&
    input.lastDocRef !== input.doc
  const indexChanged = next !== input.currentIndex
  const nonIdle = input.gesture.phase !== "idle" || input.gesture.progress !== 0
  const singlePageStale = input.pageCount <= 1 && nonIdle
  if (seqChanged || indexChanged || singlePageStale || docReplaced) {
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
