import { useCallback, useEffect, useRef, useState } from "react"
import type { HomeDocument, PageId } from "@yindex/domain"
import { setLastPageId } from "@yindex/domain"
import { loadHomeDocument, saveHomeDocument } from "../storage/homeStorage"

export type HomeState = {
  readonly doc: HomeDocument | null
  readonly loading: boolean
  readonly error: string | null
  readonly setDoc: (doc: HomeDocument | ((prev: HomeDocument) => HomeDocument)) => void
  readonly persistNow: () => Promise<void>
  readonly rememberPage: (pageId: PageId) => void
}

export function useHomeState(): HomeState {
  const [doc, setDocState] = useState<HomeDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const docRef = useRef<HomeDocument | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = await loadHomeDocument()
        if (!cancelled) {
          docRef.current = loaded
          setDocState(loaded)
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
  }, [])

  const scheduleSave = useCallback((next: HomeDocument) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveHomeDocument(next)
    }, 200)
  }, [])

  const setDoc = useCallback(
    (input: HomeDocument | ((prev: HomeDocument) => HomeDocument)) => {
      setDocState((prev) => {
        if (!prev) return prev
        const next = typeof input === "function" ? input(prev) : input
        docRef.current = next
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const persistNow = useCallback(async () => {
    if (docRef.current) await saveHomeDocument(docRef.current)
  }, [])

  const rememberPage = useCallback(
    (pageId: PageId) => {
      setDoc((prev) => setLastPageId(prev, pageId))
    },
    [setDoc],
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (docRef.current) void saveHomeDocument(docRef.current)
    }
  }, [])

  return { doc, loading, error, setDoc, persistNow, rememberPage }
}
