import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  adjacentIndex,
  indexOfPage,
  resolveOpenPageId,
  type HomeDocument,
  type PageId,
} from "@yindex/domain"

export type PageTurnApi = {
  readonly currentIndex: number
  readonly currentPageId: PageId | null
  readonly isTurning: boolean
  readonly goToIndex: (index: number) => void
  readonly goBy: (delta: number) => void
  /** Percent of the multi-page strip height (0, -100/n, -200/n, …) */
  readonly offsetY: number
  readonly reducedMotion: boolean
}

const WHEEL_THRESHOLD = 80
const COOLDOWN_MS = 520
const TURN_MS = 480

function prefersReducedMotion(
  setting: HomeDocument["settings"]["reducedMotion"],
): boolean {
  if (setting === "force") return true
  if (setting === "never") return false
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function usePageTurn(
  doc: HomeDocument | null,
  options: {
    readonly editMode: boolean
    readonly settingsOpen: boolean
    readonly onPageChange?: (pageId: PageId) => void
  },
): PageTurnApi {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTurning, setIsTurning] = useState(false)
  const wheelAcc = useRef(0)
  const cooldownUntil = useRef(0)
  const initialized = useRef(false)
  const onPageChangeRef = useRef(options.onPageChange)
  onPageChangeRef.current = options.onPageChange
  const indexRef = useRef(0)
  indexRef.current = currentIndex

  const pageCount = doc?.sequence.pageIds.length ?? 0
  const reducedMotion = doc
    ? prefersReducedMotion(doc.settings.reducedMotion)
    : false

  // Initial open page + keep index valid when sequence shrinks
  useEffect(() => {
    if (!doc || pageCount === 0) return
    if (!initialized.current) {
      const openId = resolveOpenPageId(doc.sequence, {
        rememberLastPage: doc.settings.rememberLastPage,
        lastPageId: doc.lastPageId,
      })
      const idxR = indexOfPage(doc.sequence, openId)
      if (idxR.ok) {
        setCurrentIndex(idxR.value)
        indexRef.current = idxR.value
      }
      initialized.current = true
      return
    }
    if (currentIndex >= pageCount) {
      const next = pageCount - 1
      setCurrentIndex(next)
      indexRef.current = next
    }
  }, [doc, pageCount, currentIndex])

  const currentPageId = useMemo(() => {
    if (!doc) return null
    return doc.sequence.pageIds[currentIndex] ?? null
  }, [doc, currentIndex])

  // Strip has n pages each 100/n % of strip → move by i * (100/n) of strip
  const rawOffset = pageCount > 0 ? -currentIndex * (100 / pageCount) : 0
  const offsetY = rawOffset === 0 ? 0 : rawOffset

  const goToIndex = useCallback(
    (index: number) => {
      if (!doc || pageCount === 0) return
      if (index < 0 || index >= pageCount) return
      if (index === indexRef.current) return
      setIsTurning(true)
      setCurrentIndex(index)
      indexRef.current = index
      const id = doc.sequence.pageIds[index]
      if (id) onPageChangeRef.current?.(id)
      const ms = reducedMotion ? 0 : TURN_MS
      window.setTimeout(() => setIsTurning(false), ms)
    },
    [doc, pageCount, reducedMotion],
  )

  const goBy = useCallback(
    (delta: number) => {
      if (!doc || pageCount === 0) return
      const nextR = adjacentIndex(doc.sequence, indexRef.current, delta)
      if (nextR.ok) goToIndex(nextR.value)
    },
    [doc, pageCount, goToIndex],
  )

  useEffect(() => {
    if (!doc || options.editMode || options.settingsOpen) return

    function onWheel(e: WheelEvent) {
      const target = e.target as HTMLElement | null
      const scrollable = target?.closest(
        "[data-scrollable='true']",
      ) as HTMLElement | null
      if (scrollable) {
        const canScroll =
          scrollable.scrollHeight > scrollable.clientHeight &&
          ((e.deltaY > 0 &&
            scrollable.scrollTop + scrollable.clientHeight <
              scrollable.scrollHeight - 1) ||
            (e.deltaY < 0 && scrollable.scrollTop > 0))
        if (canScroll) return
      }

      // Don't steal wheel from form controls
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      e.preventDefault()
      const now = Date.now()
      if (now < cooldownUntil.current) {
        wheelAcc.current = 0
        return
      }
      wheelAcc.current += e.deltaY
      if (Math.abs(wheelAcc.current) >= WHEEL_THRESHOLD) {
        const dir = wheelAcc.current > 0 ? 1 : -1
        wheelAcc.current = 0
        cooldownUntil.current = now + COOLDOWN_MS
        goBy(dir)
      }
    }

    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault()
        goBy(1)
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault()
        goBy(-1)
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        goToIndex(idx)
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
    }
  }, [doc, options.editMode, options.settingsOpen, goBy, goToIndex])

  return {
    currentIndex,
    currentPageId,
    isTurning,
    goToIndex,
    goBy,
    offsetY,
    reducedMotion,
  }
}
