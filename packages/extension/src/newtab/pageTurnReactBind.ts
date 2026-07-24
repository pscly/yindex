import type { GestureSnapshot } from "./pageTurnGesture"
import type { PageTurnHostDeps } from "./pageTurnHost"
import { bindPageTurnHost } from "./pageTurnHost"
import type { SpringParams } from "./pageTurnPolicy"
import type { SpringState } from "./pageTurnSpring"
import {
  type SpringLoopCallbacks,
  bindSpringLoopDrivers,
} from "./pageTurnSpringLoop"

export function bindWheelKeyboard(input: {
  readonly pageCount: number
  readonly reducedMotion: boolean
  readonly getGesture: () => GestureSnapshot
  readonly setGesture: (g: GestureSnapshot) => void
  readonly stopSpringRaf: () => void
  readonly startSettle: (
    targetProgress: number,
    targetIndex: number,
    now: number,
  ) => void
  readonly onIndexCommitted: (index: number) => void
  readonly bump: () => void
  readonly goBy: (delta: number) => void
  readonly goToIndex: (index: number) => void
  readonly setSpring: (s: SpringState) => void
  readonly isMounted: () => boolean
}): () => void {
  const deps: PageTurnHostDeps = {
    getGesture: input.getGesture,
    setGesture: input.setGesture,
    pageCount: input.pageCount,
    reducedMotion: input.reducedMotion,
    stopSpringRaf: input.stopSpringRaf,
    startSettle: input.startSettle,
    onIndexCommitted: (index) => input.onIndexCommitted(index),
    bump: input.bump,
    goBy: input.goBy,
    goToIndex: input.goToIndex,
    setSpringFromTracking: (progress, velocity) => {
      input.setSpring({ x: progress, v: velocity })
    },
  }
  return bindPageTurnHost(deps, input.isMounted)
}

export function runSpringLoop(input: {
  readonly loop: {
    readonly start: (cb: SpringLoopCallbacks) => void
    readonly stop: () => void
  }
  readonly isMounted: () => boolean
  readonly gestureRef: { current: GestureSnapshot }
  readonly springRef: { current: SpringState }
  readonly paramsRef: { current: SpringParams }
  readonly onSettled: SpringLoopCallbacks["onSettled"]
  readonly bump: () => void
}): void {
  bindSpringLoopDrivers({
    loop: input.loop,
    isMounted: input.isMounted,
    getGesture: () => input.gestureRef.current,
    setGesture: (g) => {
      input.gestureRef.current = g
    },
    getSpring: () => input.springRef.current,
    setSpring: (s) => {
      input.springRef.current = s
    },
    getParams: () => input.paramsRef.current,
    onSettled: input.onSettled,
    bump: input.bump,
  })
}
