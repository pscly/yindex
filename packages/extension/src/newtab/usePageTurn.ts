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
  readonly offsetY: number
}

const WHEEL_THRESHOLD = 80
const COOLDOWN_MS = 520

export function usePageTurn(
  doc: HomeDocument | null,
  options: {
    readonly editMode: boolean
    readonly onPageChange?: (pageId: PageId) => void
  },
): PageTurnApi {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTurning, setIsTurning] = useState(false)
  const [offsetY, setOffsetY] = useState(0)
  const wheelAcc = useRef(0)
  const cooldownUntil = useRef(0)
  const initialized = useRef(false)

  const pageCount = doc?.sequence.pageIds.length ?? 0

  useEffect(() => {
    if (!doc || initialized.current) return
    const openId = resolveOpenPageId(doc.sequence, {
      rememberLastPage: doc.settings.rememberLastPage,
      lastPageId: doc.lastPageId,
    })
    const idxR = indexOfPage(doc.sequence, openId)
    if (idxR.ok) setCurrentIndex(idxR.value)
    initialized.current = true
  }, [doc])

  const currentPageId = useMemo(() => {
    if (!doc) return null
    return doc.sequence.pageIds[currentIndex] ?? null
  }, [doc, currentIndex])

  const goToIndex = useCallback(
    (index: number) => {
      if (!doc || pageCount === 0) return
      if (index < 0 || index >= pageCount) return
      if (index === currentIndex) return
      setIsTurning(true)
      setCurrentIndex(index)
      const id = doc.sequence.pageIds[index]
      if (id) options.onPageChange?.(id)
      window.setTimeout(() => setIsTurning(false), 480)
    },
    [doc, pageCount, currentIndex, options],
  )

  const goBy = useCallback(
    (delta: number) => {
      if (!doc || pageCount === 0) return
      const nextR = adjacentIndex(doc.sequence, currentIndex, delta)
      if (nextR.ok) goToIndex(nextR.value)
    },
    [doc, pageCount, currentIndex, goToIndex],
  )

  useEffect(() => {
    if (!doc || options.editMode) return

    function onWheel(e: WheelEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest("[data-scrollable='true']")) {
        const el = target.closest("[data-scrollable='true']") as HTMLElement
        const canScroll =
          el.scrollHeight > el.clientHeight &&
          ((e.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) ||
            (e.deltaY < 0 && el.scrollTop > 0))
        if (canScroll) return
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
  }, [doc, options.editMode, goBy, goToIndex])

  // visual offset for CSS transform strip
  useEffect(() => {
    setOffsetY(-currentIndex * 100)
  }, [currentIndex])

  return {
    currentIndex,
    currentPageId,
    isTurning,
    goToIndex,
    goBy,
    offsetY,
  }
}
