import { createIdleGesture } from "./pageTurnGesturePublic"
import { clampProgress, handleTick, handleWheel } from "./pageTurnGestureSteps"
import type {
  GestureEvent,
  GestureSnapshot,
  GestureStep,
} from "./pageTurnGestureTypes"

export type {
  TurnDirection,
  GesturePhase,
  GestureSnapshot,
  GestureEvent,
  GestureDecision,
  GestureStep,
} from "./pageTurnGestureTypes"
export {
  createIdleGesture,
  progressSpanPx,
  shouldCommit,
  enterCooldown,
} from "./pageTurnGesturePublic"
export {
  wrapPageIndex,
  stripOffsetFraction,
  reducedMotionOffsetFraction,
  reducedFadeT,
  parallaxOffset,
  parallaxForProfile,
} from "./pageTurnLayout"

export function stepGesture(
  state: GestureSnapshot,
  event: GestureEvent,
  opts: {
    readonly viewportHeight: number
    readonly pageCount: number
    readonly reducedMotion: boolean
  },
): GestureStep {
  const { viewportHeight, pageCount, reducedMotion } = opts
  if (pageCount <= 0) {
    return {
      state: createIdleGesture(0, event.now),
      decision: { kind: "none" },
    }
  }
  if (pageCount <= 1) {
    // Every public boundary is an idle same-index no-op: no commit, no offset turn.
    const index =
      event.kind === "force_idle"
        ? event.index
        : event.kind === "begin_reduced_fade"
          ? event.fromIndex
          : state.baseIndex
    return {
      state: createIdleGesture(index, event.now),
      decision: { kind: "none" },
    }
  }

  switch (event.kind) {
    case "force_idle":
      return {
        state: createIdleGesture(event.index, event.now),
        decision: { kind: "none" },
      }
    case "begin_reduced_fade": {
      if (!reducedMotion) return { state, decision: { kind: "none" } }
      if (event.fromIndex === event.toIndex) {
        return { state, decision: { kind: "none" } }
      }
      return {
        state: {
          ...createIdleGesture(event.fromIndex, event.now),
          phase: "reduced_fade",
          baseIndex: event.fromIndex,
          targetIndex: event.toIndex,
          reducedFadeFrom: event.fromIndex,
          reducedFadeTo: event.toIndex,
          reducedFadeStartAt: event.now,
        },
        decision: { kind: "none" },
      }
    }
    case "begin_settle":
      return {
        state: {
          ...state,
          phase: "settling",
          settleTarget: clampProgress(event.targetProgress),
          targetIndex: event.targetIndex,
          lastSampleAt: event.now,
        },
        decision: { kind: "none" },
      }
    case "tick":
      return handleTick(state, event.now)
    case "wheel":
      return handleWheel(state, event.deltaPx, event.now, {
        viewportHeight,
        pageCount,
        reducedMotion,
      })
    default: {
      const _exhaustive: never = event
      return _exhaustive
    }
  }
}
