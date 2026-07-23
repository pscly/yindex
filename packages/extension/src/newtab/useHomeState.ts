import { useCallback, useEffect, useRef, useState } from "react"
import type { HomeDocument, PageId } from "@yindex/domain"
import { setLastPageId } from "@yindex/domain"
import { loadHomeDocument, saveHomeDocument } from "../storage/homeStorage"
import { useHistory } from "./useHistory"

export type HomeState = {
  readonly doc: HomeDocument | null
  readonly loading: boolean
  readonly error: string | null
  /** Structural change — records undo */
  readonly setDoc: (
    doc: HomeDocument | ((prev: HomeDocument) => HomeDocument),
  ) => void
  /** Live drag / nav state — no undo entry, does not reset history */
  readonly patchDoc: (doc: HomeDocument) => void
  /** Load / full reset — clears history */
  readonly replaceDoc: (doc: HomeDocument) => void
  readonly persistNow: () => Promise<void>
  readonly rememberPage: (pageId: PageId) => void
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly undo: () => void
  readonly redo: () => void
}

export function useHomeState(): HomeState {
  const [doc, setDocState] = useState<HomeDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const docRef = useRef<HomeDocument | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const history = useHistory()
  const draggingBaseline = useRef<HomeDocument | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = await loadHomeDocument()
        if (!cancelled) {
          docRef.current = loaded
          setDocState(loaded)
          history.reset(loaded)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败")
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // mount-only load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleSave = useCallback((next: HomeDocument) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveHomeDocument(next)
    }, 200)
  }, [])

  const setDoc = useCallback(
    (input: HomeDocument | ((prev: HomeDocument) => HomeDocument)) => {
      const prev = docRef.current
      if (!prev) return
      const next = typeof input === "function" ? input(prev) : input
      if (next === prev) return
      // If finishing a drag gesture baseline exists, push pre-drag once
      if (draggingBaseline.current) {
        history.push(draggingBaseline.current)
        draggingBaseline.current = null
      } else {
        history.push(prev)
      }
      docRef.current = next
      setDocState(next)
      scheduleSave(next)
    },
    [history, scheduleSave],
  )

  const patchDoc = useCallback(
    (next: HomeDocument) => {
      const prev = docRef.current
      if (!prev) return
      if (!draggingBaseline.current) {
        draggingBaseline.current = prev
      }
      docRef.current = next
      setDocState(next)
      scheduleSave(next)
    },
    [scheduleSave],
  )

  const replaceDoc = useCallback(
    (next: HomeDocument) => {
      draggingBaseline.current = null
      history.reset(next)
      docRef.current = next
      setDocState(next)
      scheduleSave(next)
    },
    [history, scheduleSave],
  )

  const persistNow = useCallback(async () => {
    if (docRef.current) await saveHomeDocument(docRef.current)
  }, [])

  const rememberPage = useCallback(
    (pageId: PageId) => {
      const prev = docRef.current
      if (!prev) return
      const next = setLastPageId(prev, pageId)
      docRef.current = next
      setDocState(next)
      scheduleSave(next)
    },
    [scheduleSave],
  )

  const undo = useCallback(() => {
    const current = docRef.current
    if (!current) return
    draggingBaseline.current = null
    const prev = history.undo(current)
    if (!prev) return
    docRef.current = prev
    setDocState(prev)
    scheduleSave(prev)
  }, [history, scheduleSave])

  const redo = useCallback(() => {
    const current = docRef.current
    if (!current) return
    draggingBaseline.current = null
    const next = history.redo(current)
    if (!next) return
    docRef.current = next
    setDocState(next)
    scheduleSave(next)
  }, [history, scheduleSave])

  useEffect(() => {
    function endDragHistory() {
      const baseline = draggingBaseline.current
      const current = docRef.current
      if (baseline && current && baseline !== current) {
        history.push(baseline)
      }
      draggingBaseline.current = null
    }
    window.addEventListener("pointerup", endDragHistory)
    return () => {
      window.removeEventListener("pointerup", endDragHistory)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (docRef.current) void saveHomeDocument(docRef.current)
    }
  }, [history])

  return {
    doc,
    loading,
    error,
    setDoc,
    patchDoc,
    replaceDoc,
    persistNow,
    rememberPage,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo,
    redo,
  }
}
