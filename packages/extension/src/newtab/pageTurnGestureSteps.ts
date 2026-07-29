import { createIdleGesture, shouldCommit } from "./pageTurnGesturePublic"
import type {
  GestureSnapshot,
  GestureStep,
  TurnDirection,
} from "./pageTurnGestureTypes"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"
import { applyTrackingDelta, handleReducedWheel } from "./pageTurnTracking"

export function clampProgress(p: number): number {
  if (!Number.isFinite(p)) return 0
  return Math.max(-1, Math.min(1, p))
}

/** True while cooldown duration or post-sample idle silence still blocks a new Page. */
export function isCooldownBlocking(
  state: GestureSnapshot,
  now: number,
): boolean {
  if (now < state.cooldownUntil) return true
  if (state.phase === "cooldown") {
    return now - state.lastSampleAt < PAGE_TURN_POLICY.idleReleaseMs
  }
  return false
}

export function handleTick(state: GestureSnapshot, now: number): GestureStep {
  if (state.phase === "cooldown") {
    if (isCooldownBlocking(state, now)) {
      return { state, decision: { kind: "none" } }
    }
    return {
      state: createIdleGesture(state.baseIndex, now),
      decision: { kind: "none" },
    }
  }

  if (state.phase === "reduced_fade") {
    if (now - state.reducedFadeStartAt >= PAGE_TURN_POLICY.reducedMotionMs) {
      const idx = state.targetIndex ?? state.baseIndex
      return {
        state: createIdleGesture(idx, now),
        decision: { kind: "reduced_settled", index: idx },
      }
    }
    return { state, decision: { kind: "none" } }
  }

  if (state.phase === "tracking") {
    if (now - state.lastSampleAt >= PAGE_TURN_POLICY.idleReleaseMs) {
      return decideRelease(state, now)
    }
    return { state, decision: { kind: "none" } }
  }

  return { state, decision: { kind: "none" } }
}

function decideRelease(state: GestureSnapshot, now: number): GestureStep {
  if (shouldCommit(state.progress, state.velocity)) {
    const dir: TurnDirection =
      state.progress > 0 || (state.progress === 0 && state.velocity > 0)
        ? 1
        : -1
    return {
      state: {
        ...state,
        phase: "settling",
        settleTarget: dir,
        lastSampleAt: now,
      },
      decision: {
        kind: "commit",
        fromIndex: state.baseIndex,
        toIndex: state.baseIndex + dir,
        progress: state.progress,
        velocity: state.velocity,
      },
    }
  }

  if (Math.abs(state.progress) < 1e-6) {
    return {
      state: createIdleGesture(state.baseIndex, now),
      decision: { kind: "none" },
    }
  }

  return {
    state: {
      ...state,
      phase: "settling",
      settleTarget: 0,
      targetIndex: state.baseIndex,
      lastSampleAt: now,
    },
    decision: {
      kind: "return",
      index: state.baseIndex,
      progress: state.progress,
      velocity: state.velocity,
    },
  }
}

function settleInputDir(deltaPx: number): TurnDirection | 0 {
  if (deltaPx > 0) return 1
  if (deltaPx < 0) return -1
  return 0
}

function settleTargetDir(state: GestureSnapshot): TurnDirection {
  if (state.settleTarget > 0) return 1
  if (state.settleTarget < 0) return -1
  if (state.lockedDir !== null) return state.lockedDir
  return state.progress >= 0 ? 1 : -1
}

export function handleWheel(
  state: GestureSnapshot,
  deltaPx: number,
  now: number,
  opts: {
    readonly viewportHeight: number
    readonly pageCount: number
    readonly reducedMotion: boolean
  },
): GestureStep {
  if (!Number.isFinite(deltaPx) || deltaPx === 0) {
    return { state, decision: { kind: "none" } }
  }

  if (isCooldownBlocking(state, now)) {
    return {
      state: {
        ...state,
        phase: "cooldown",
        lastSampleAt: now,
      },
      decision: { kind: "none" },
    }
  }

  if (opts.reducedMotion) {
    return handleReducedWheel(state, deltaPx, now, opts.pageCount)
  }

  if (state.phase === "settling") {
    const inputDir = settleInputDir(deltaPx)
    const targetDir = settleTargetDir(state)
    if (inputDir === 0 || inputDir === targetDir) {
      return {
        state: { ...state, lastSampleAt: now },
        decision: { kind: "none" },
      }
    }
    const acc = state.wheelAccPx + deltaPx
    if (Math.abs(acc) < PAGE_TURN_POLICY.directionLockPx) {
      return {
        state: {
          ...state,
          wheelAccPx: acc,
          lastSampleAt: now,
        },
        decision: { kind: "none" },
      }
    }
    const interrupted: GestureSnapshot = {
      ...state,
      phase: "tracking",
      targetIndex: null,
      settleTarget: 0,
      velocity: 0,
      wheelAccPx: 0,
      lastSampleAt: now,
    }
    return applyTrackingDelta(interrupted, deltaPx, now, opts.viewportHeight)
  }

  if (state.phase === "reduced_fade") {
    return { state, decision: { kind: "none" } }
  }

  if (state.phase === "idle") {
    const next: GestureSnapshot = {
      ...createIdleGesture(state.baseIndex, now),
      phase: "tracking",
      lastSampleAt: now,
    }
    return applyTrackingDelta(next, deltaPx, now, opts.viewportHeight)
  }

  if (state.phase === "tracking") {
    return applyTrackingDelta(state, deltaPx, now, opts.viewportHeight)
  }

  return { state, decision: { kind: "none" } }
}
