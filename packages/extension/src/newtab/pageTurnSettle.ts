import { type GestureSnapshot, stepGesture } from "./pageTurnGesture"
import { idleAt } from "./pageTurnNav"
import type { SpringParams } from "./pageTurnPolicy"
import { runSpringLoop } from "./pageTurnReactBind"
import type { SpringState } from "./pageTurnSpring"
import { applySpringFinish, type createSpringLoop } from "./pageTurnSpringLoop"

export type SettleRuntime = {
  readonly gestureRef: { current: GestureSnapshot }
  readonly springRef: { current: SpringState }
  readonly springParamsRef: { current: SpringParams }
  readonly springLoop: ReturnType<typeof createSpringLoop>
  readonly generationRef: { current: number }
  readonly indexRef: { current: number }
  readonly pageCount: number
  readonly reducedMotion: boolean
  readonly isMounted: () => boolean
  readonly bump: () => void
  readonly stopRaf: () => void
  readonly setIndex: (index: number) => void
  readonly notifyPage: (index: number) => void
}

export function forceIdleAt(
  rt: Pick<SettleRuntime, "gestureRef" | "springRef" | "stopRaf" | "bump">,
  index: number,
): void {
  rt.stopRaf()
  rt.gestureRef.current = idleAt(index)
  rt.springRef.current = { x: 0, v: 0 }
  rt.bump()
}

export function handleSpringSettled(
  rt: SettleRuntime,
  committed: boolean,
  targetIndex: number,
  now: number,
  gen: number,
): void {
  if (gen !== rt.generationRef.current) return
  if (rt.pageCount <= 1) {
    forceIdleAt(rt, rt.indexRef.current)
    return
  }
  const fin = applySpringFinish({
    committed,
    targetIndex,
    now,
    pageCount: rt.pageCount,
    currentIndex: rt.indexRef.current,
    gesture: rt.gestureRef.current,
  })
  if (committed) {
    rt.setIndex(fin.index)
    rt.indexRef.current = fin.index
    rt.notifyPage(fin.index)
  }
  rt.gestureRef.current = fin.gesture
  rt.springRef.current = fin.spring
  rt.stopRaf()
  rt.bump()
}

export function beginSettle(
  rt: SettleRuntime,
  targetProgress: number,
  targetIndex: number,
  now: number,
): void {
  if (rt.pageCount <= 1) {
    forceIdleAt(rt, rt.indexRef.current)
    return
  }
  const gen = rt.generationRef.current
  rt.springRef.current = {
    x: rt.gestureRef.current.progress,
    v: rt.gestureRef.current.velocity,
  }
  rt.gestureRef.current = stepGesture(
    rt.gestureRef.current,
    { kind: "begin_settle", targetProgress, targetIndex, now },
    {
      viewportHeight: window.innerHeight || 800,
      pageCount: rt.pageCount,
      reducedMotion: rt.reducedMotion,
    },
  ).state
  rt.bump()
  runSpringLoop({
    loop: rt.springLoop,
    isMounted: rt.isMounted,
    gestureRef: rt.gestureRef,
    springRef: rt.springRef,
    paramsRef: rt.springParamsRef,
    onSettled: (committed, idx, settledAt) => {
      handleSpringSettled(rt, committed, idx, settledAt, gen)
    },
    bump: rt.bump,
  })
}

export function beginGoBySettle(
  rt: SettleRuntime,
  gesture: GestureSnapshot,
  spring: SpringState,
  gen: number,
): void {
  rt.springRef.current = spring
  rt.gestureRef.current = gesture
  rt.bump()
  runSpringLoop({
    loop: rt.springLoop,
    isMounted: rt.isMounted,
    gestureRef: rt.gestureRef,
    springRef: rt.springRef,
    paramsRef: rt.springParamsRef,
    onSettled: (committed, idx, settledAt) => {
      handleSpringSettled(rt, committed, idx, settledAt, gen)
    },
    bump: rt.bump,
  })
}
