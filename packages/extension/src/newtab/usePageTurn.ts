import type { HomeDocument, MotionProfile, PageId } from "@yindex/domain"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { resolveGoByAction, resolveGoToAction } from "./pageTurnActions"
import { syncPageTurnDocument } from "./pageTurnDocSync"
import type { GestureSnapshot } from "./pageTurnGesture"
import { attachPageTurnHost } from "./pageTurnHookBind"
import { idleAt } from "./pageTurnNav"
import { type SpringParams, springParamsForProfile } from "./pageTurnPolicy"
import {
  type SettleRuntime,
  beginGoBySettle,
  beginSettle,
} from "./pageTurnSettle"
import type { SpringState } from "./pageTurnSpring"
import { createSpringLoop } from "./pageTurnSpringLoop"
import { computePageTurnVisual } from "./pageTurnVisual"
import { prefersReducedMotion } from "./pageTurnWheelGuard"

export type PageTurnApi = {
  readonly currentIndex: number
  readonly currentPageId: PageId | null
  readonly isTurning: boolean
  readonly goToIndex: (index: number) => void
  readonly goBy: (delta: number) => void
  readonly offsetY: number
  readonly reducedMotion: boolean
  readonly fadeOpacity: { readonly from: number; readonly to: number }
  readonly parallaxY: number
  readonly isAnimating: boolean
  readonly fadeLayers: ReturnType<typeof computePageTurnVisual>["fadeLayers"]
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
  const [renderTick, setRenderTick] = useState(0)
  const gestureRef = useRef<GestureSnapshot>(idleAt(0))
  const springRef = useRef<SpringState>({ x: 0, v: 0 })
  const springParamsRef = useRef<SpringParams>(
    springParamsForProfile("balanced"),
  )
  const springLoopRef = useRef(createSpringLoop())
  const initialized = useRef(false)
  const onPageChangeRef = useRef(options.onPageChange)
  onPageChangeRef.current = options.onPageChange
  const indexRef = useRef(0)
  indexRef.current = currentIndex
  const mountedRef = useRef(true)
  const generationRef = useRef(0)
  const lastSeqKeyRef = useRef("")

  const pageCount = doc?.sequence.pageIds.length ?? 0
  const motionProfile: MotionProfile = doc?.settings.motionProfile ?? "balanced"
  const reducedMotion = doc
    ? prefersReducedMotion(doc.settings.reducedMotion)
    : false

  useEffect(() => {
    springParamsRef.current = springParamsForProfile(motionProfile)
  }, [motionProfile])

  useEffect(() => {
    mountedRef.current = true
    const loop = springLoopRef.current
    return () => {
      mountedRef.current = false
      loop.stop()
    }
  }, [])

  const bump = useCallback(() => {
    if (mountedRef.current) setRenderTick((n) => n + 1)
  }, [])

  const notifyPage = useCallback(
    (index: number) => {
      const id = doc?.sequence.pageIds[index]
      if (id) onPageChangeRef.current?.(id)
    },
    [doc],
  )

  const stopRaf = useCallback(() => springLoopRef.current.stop(), [])

  const settleRt = useCallback((): SettleRuntime => {
    return {
      gestureRef,
      springRef,
      springParamsRef,
      springLoop: springLoopRef.current,
      generationRef,
      indexRef,
      pageCount,
      reducedMotion,
      isMounted: () => mountedRef.current,
      bump,
      stopRaf,
      setIndex: setCurrentIndex,
      notifyPage,
    }
  }, [bump, notifyPage, pageCount, reducedMotion, stopRaf])

  const startSettle = useCallback(
    (targetProgress: number, targetIndex: number, now: number) => {
      beginSettle(settleRt(), targetProgress, targetIndex, now)
    },
    [settleRt],
  )

  useEffect(() => {
    if (!doc || pageCount === 0) return
    const synced = syncPageTurnDocument({
      doc,
      pageCount,
      currentIndex,
      initialized: initialized.current,
      lastSeqKey: lastSeqKeyRef.current,
      generation: generationRef.current,
      gesture: gestureRef.current,
    })
    initialized.current = synced.initialized
    lastSeqKeyRef.current = synced.lastSeqKey
    generationRef.current = synced.generation
    if (synced.invalidated) stopRaf()
    if (synced.indexChanged || synced.invalidated) {
      if (synced.indexChanged) {
        setCurrentIndex(synced.index)
        indexRef.current = synced.index
      }
      gestureRef.current = synced.gesture
      springRef.current = synced.spring
      if (synced.invalidated) bump()
    }
  }, [bump, currentIndex, doc, pageCount, stopRaf])

  const currentPageId = useMemo(() => {
    if (!doc) return null
    return doc.sequence.pageIds[currentIndex] ?? null
  }, [doc, currentIndex])

  const goToIndex = useCallback(
    (index: number) => {
      if (!doc) return
      const plan = resolveGoToAction({
        index,
        pageCount,
        currentIndex: indexRef.current,
        phase: gestureRef.current.phase,
        reducedMotion,
        now: performance.now(),
      })
      if (plan.kind === "noop") return
      stopRaf()
      if (plan.kind === "reduced_fade") {
        gestureRef.current = plan.gesture
        bump()
        return
      }
      setCurrentIndex(plan.index)
      indexRef.current = plan.index
      notifyPage(plan.index)
      springRef.current = { x: 0, v: 0 }
      gestureRef.current = plan.gesture
      bump()
    },
    [bump, doc, notifyPage, pageCount, reducedMotion, stopRaf],
  )

  const goBy = useCallback(
    (delta: number) => {
      if (!doc) return
      const action = resolveGoByAction({
        sequence: doc.sequence,
        currentIndex: indexRef.current,
        delta,
        gesture: gestureRef.current,
        now: performance.now(),
        reducedMotion,
        generation: generationRef.current,
      })
      if (action.kind === "noop") return
      if (action.kind === "reduced") {
        goToIndex(action.targetIndex)
        return
      }
      beginGoBySettle(
        settleRt(),
        action.gesture,
        action.spring,
        action.generation,
      )
    },
    [doc, goToIndex, reducedMotion, settleRt],
  )

  useEffect(() => {
    if (!doc || options.editMode || options.settingsOpen) return
    return attachPageTurnHost({
      pageCount,
      reducedMotion,
      gestureRef,
      springRef,
      stopRaf,
      startSettle,
      onIndexCommitted: (index) => {
        setCurrentIndex(index)
        indexRef.current = index
        notifyPage(index)
      },
      bump,
      goBy,
      goToIndex,
      isMounted: () => mountedRef.current,
    })
  }, [
    bump,
    doc,
    goBy,
    goToIndex,
    notifyPage,
    options.editMode,
    options.settingsOpen,
    pageCount,
    reducedMotion,
    startSettle,
    stopRaf,
  ])

  void renderTick
  const nowMs = typeof performance !== "undefined" ? performance.now() : 0
  const visual = computePageTurnVisual({
    gesture: gestureRef.current,
    currentIndex,
    pageCount,
    motionProfile,
    reducedMotion,
    nowMs,
  })
  return {
    currentIndex,
    currentPageId,
    isTurning: visual.isTurning,
    goToIndex,
    goBy,
    offsetY: visual.offsetY,
    reducedMotion,
    fadeOpacity: visual.fadeOpacity,
    parallaxY: visual.parallaxY,
    isAnimating: visual.isAnimating,
    fadeLayers: visual.fadeLayers,
  }
}
