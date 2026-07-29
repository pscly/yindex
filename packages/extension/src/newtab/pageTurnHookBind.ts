import type { GestureSnapshot } from "./pageTurnGesture"
import { idleAt } from "./pageTurnNav"
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

/** Cancel spring/tracking and return to committed idle (Edit/Settings entry). */
export function cancelPageTurnToIdle(input: {
  readonly index: number
  readonly gestureRef: { current: GestureSnapshot }
  readonly springRef: { current: SpringState }
  readonly stopRaf: () => void
  readonly bump: () => void
}): void {
  input.stopRaf()
  input.gestureRef.current = idleAt(input.index)
  input.springRef.current = { x: 0, v: 0 }
  input.bump()
}

/** Browse-mode host bind, or cancel when Edit/Settings is open. */
export function bindOrCancelPageTurnHost(input: {
  readonly docPresent: boolean
  readonly editMode: boolean
  readonly settingsOpen: boolean
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
  readonly currentIndex: number
}): (() => void) | undefined {
  if (!input.docPresent) return undefined
  if (input.editMode || input.settingsOpen) {
    cancelPageTurnToIdle({
      index: input.currentIndex,
      gestureRef: input.gestureRef,
      springRef: input.springRef,
      stopRaf: input.stopRaf,
      bump: input.bump,
    })
    return undefined
  }
  return attachPageTurnHost(input)
}
