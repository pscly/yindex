import type { GestureSnapshot } from "./pageTurnGesture"
import { bindWheelKeyboard } from "./pageTurnReactBind"
import type { SpringState } from "./pageTurnSpring"

export function attachPageTurnHost(input: {
  readonly pageCount: number
  readonly reducedMotion: boolean
  readonly gestureRef: { current: GestureSnapshot }
  readonly springRef: { current: SpringState }
  readonly stopRaf: () => void
  readonly startSettle: (
    targetProgress: number,
    targetIndex: number,
    now: number,
  ) => void
  readonly onIndexCommitted: (index: number) => void
  readonly bump: () => void
  readonly goBy: (delta: number) => void
  readonly goToIndex: (index: number) => void
  readonly isMounted: () => boolean
}): () => void {
  return bindWheelKeyboard({
    pageCount: input.pageCount,
    reducedMotion: input.reducedMotion,
    getGesture: () => input.gestureRef.current,
    setGesture: (g) => {
      input.gestureRef.current = g
    },
    stopSpringRaf: input.stopRaf,
    startSettle: input.startSettle,
    onIndexCommitted: input.onIndexCommitted,
    bump: input.bump,
    goBy: input.goBy,
    goToIndex: input.goToIndex,
    setSpring: (s) => {
      input.springRef.current = s
    },
    isMounted: input.isMounted,
  })
}
