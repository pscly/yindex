import type { PageId } from "../ids/ids"
import { type Result, err, ok } from "../result/result"

export type SequenceError =
  | { readonly code: "empty"; readonly message: string }
  | { readonly code: "not_found"; readonly message: string }
  | { readonly code: "duplicate"; readonly message: string }
  | { readonly code: "invalid_index"; readonly message: string }

export type PageSequence = {
  readonly pageIds: readonly PageId[]
  readonly landingPageId: PageId
}

export function createSequence(
  pageIds: readonly PageId[],
  landingPageId?: PageId,
): Result<PageSequence, SequenceError> {
  if (pageIds.length === 0) {
    return err({
      code: "empty",
      message: "Page Sequence requires at least 1 Page",
    })
  }
  const seen = new Set<string>()
  for (const id of pageIds) {
    if (seen.has(id)) {
      return err({ code: "duplicate", message: `duplicate page id: ${id}` })
    }
    seen.add(id)
  }
  const landing = landingPageId ?? pageIds[0]
  if (!landing || !seen.has(landing)) {
    return err({ code: "not_found", message: "landing page not in sequence" })
  }
  return ok({ pageIds, landingPageId: landing })
}

export function indexOfPage(
  sequence: PageSequence,
  pageId: PageId,
): Result<number, SequenceError> {
  const idx = sequence.pageIds.indexOf(pageId)
  if (idx < 0) {
    return err({ code: "not_found", message: `page not found: ${pageId}` })
  }
  return ok(idx)
}

/** Adjacent index with Loop (wrap). delta is typically ±1. */
export function adjacentIndex(
  sequence: PageSequence,
  currentIndex: number,
  delta: number,
): Result<number, SequenceError> {
  const n = sequence.pageIds.length
  if (n === 0) {
    return err({ code: "empty", message: "empty sequence" })
  }
  if (currentIndex < 0 || currentIndex >= n) {
    return err({
      code: "invalid_index",
      message: `index out of range: ${currentIndex}`,
    })
  }
  const next = (((currentIndex + delta) % n) + n) % n
  return ok(next)
}

export function adjacentPageId(
  sequence: PageSequence,
  currentPageId: PageId,
  delta: number,
): Result<PageId, SequenceError> {
  const idxR = indexOfPage(sequence, currentPageId)
  if (!idxR.ok) return idxR
  const nextR = adjacentIndex(sequence, idxR.value, delta)
  if (!nextR.ok) return nextR
  const id = sequence.pageIds[nextR.value]
  if (!id) {
    return err({ code: "not_found", message: "adjacent page missing" })
  }
  return ok(id)
}

export function insertPage(
  sequence: PageSequence,
  pageId: PageId,
  atIndex: number,
): Result<PageSequence, SequenceError> {
  if (sequence.pageIds.includes(pageId)) {
    return err({
      code: "duplicate",
      message: `page already in sequence: ${pageId}`,
    })
  }
  if (atIndex < 0 || atIndex > sequence.pageIds.length) {
    return err({
      code: "invalid_index",
      message: `insert index invalid: ${atIndex}`,
    })
  }
  const pageIds = [
    ...sequence.pageIds.slice(0, atIndex),
    pageId,
    ...sequence.pageIds.slice(atIndex),
  ]
  return ok({ ...sequence, pageIds })
}

export function removePage(
  sequence: PageSequence,
  pageId: PageId,
): Result<PageSequence, SequenceError> {
  if (sequence.pageIds.length <= 1) {
    return err({ code: "empty", message: "cannot remove last Page" })
  }
  const idx = sequence.pageIds.indexOf(pageId)
  if (idx < 0) {
    return err({ code: "not_found", message: `page not found: ${pageId}` })
  }
  const pageIds = sequence.pageIds.filter((id) => id !== pageId)
  let landingPageId = sequence.landingPageId
  if (landingPageId === pageId) {
    const fallback = pageIds[Math.min(idx, pageIds.length - 1)]
    if (!fallback) {
      return err({ code: "empty", message: "no fallback landing" })
    }
    landingPageId = fallback
  }
  return ok({ pageIds, landingPageId })
}

export function reorderPage(
  sequence: PageSequence,
  pageId: PageId,
  toIndex: number,
): Result<PageSequence, SequenceError> {
  const from = sequence.pageIds.indexOf(pageId)
  if (from < 0) {
    return err({ code: "not_found", message: `page not found: ${pageId}` })
  }
  if (toIndex < 0 || toIndex >= sequence.pageIds.length) {
    return err({
      code: "invalid_index",
      message: `toIndex invalid: ${toIndex}`,
    })
  }
  if (from === toIndex) return ok(sequence)
  const next = [...sequence.pageIds]
  const [removed] = next.splice(from, 1)
  if (!removed) {
    return err({ code: "not_found", message: "splice failed" })
  }
  next.splice(toIndex, 0, removed)
  return ok({ ...sequence, pageIds: next })
}

export function setLanding(
  sequence: PageSequence,
  pageId: PageId,
): Result<PageSequence, SequenceError> {
  if (!sequence.pageIds.includes(pageId)) {
    return err({
      code: "not_found",
      message: `landing not in sequence: ${pageId}`,
    })
  }
  return ok({ ...sequence, landingPageId: pageId })
}

export function resolveOpenPageId(
  sequence: PageSequence,
  options: {
    readonly rememberLastPage: boolean
    readonly lastPageId: PageId | null
  },
): PageId {
  if (
    options.rememberLastPage &&
    options.lastPageId &&
    sequence.pageIds.includes(options.lastPageId)
  ) {
    return options.lastPageId
  }
  return sequence.landingPageId
}
