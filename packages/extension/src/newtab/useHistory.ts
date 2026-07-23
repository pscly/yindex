import { useCallback, useMemo, useRef, useState } from "react"
import type { HomeDocument } from "@yindex/domain"

const MAX = 50

export type HistoryApi = {
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly push: (doc: HomeDocument) => void
  readonly undo: (current: HomeDocument) => HomeDocument | null
  readonly redo: (current: HomeDocument) => HomeDocument | null
  readonly reset: (doc: HomeDocument) => void
}

export function useHistory(): HistoryApi {
  const past = useRef<HomeDocument[]>([])
  const future = useRef<HomeDocument[]>([])
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((t) => t + 1), [])

  const push = useCallback(
    (doc: HomeDocument) => {
      past.current = [...past.current.slice(-(MAX - 1)), doc]
      future.current = []
      bump()
    },
    [bump],
  )

  const undo = useCallback(
    (current: HomeDocument): HomeDocument | null => {
      const prev = past.current[past.current.length - 1]
      if (!prev) return null
      past.current = past.current.slice(0, -1)
      future.current = [...future.current, current]
      bump()
      return prev
    },
    [bump],
  )

  const redo = useCallback(
    (current: HomeDocument): HomeDocument | null => {
      const next = future.current[future.current.length - 1]
      if (!next) return null
      future.current = future.current.slice(0, -1)
      past.current = [...past.current, current]
      bump()
      return next
    },
    [bump],
  )

  const reset = useCallback(
    (_doc: HomeDocument) => {
      past.current = []
      future.current = []
      bump()
    },
    [bump],
  )

  return useMemo(
    () => ({
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
      push,
      undo,
      redo,
      reset,
    }),
    [version, push, undo, redo, reset],
  )
}
