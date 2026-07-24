import { createIdleGesture } from "./pageTurnGesturePublic"
import type {
  GestureSnapshot,
  GestureStep,
  TurnDirection,
} from "./pageTurnGestureTypes"
import { wrapPageIndex } from "./pageTurnLayout"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"

function clampProgress(p: number): number {
  if (!Number.isFinite(p)) return 0
  return Math.max(-1, Math.min(1, p))
}

function progressSpanPx(viewportHeight: number): number {
  const vh =
    Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 800
  return vh * PAGE_TURN_POLICY.progressViewportFraction
}

function emaVelocity(prevV: number, sampleV: number, dtMs: number): number {
  if (!(dtMs > 0) || !Number.isFinite(sampleV)) return prevV
  const tau = PAGE_TURN_POLICY.velocityEmaMs
  const alpha = 1 - Math.exp(-dtMs / tau)
  const next = prevV + alpha * (sampleV - prevV)
  return Number.isFinite(next) ? next : prevV
}

export function applyTrackingDelta(
  state: GestureSnapshot,
  deltaPx: number,
  now: number,
  viewportHeight: number,
): GestureStep {
  const span = progressSpanPx(viewportHeight)
  if (!(span > 0)) return { state, decision: { kind: "none" } }

  const dtMs = Math.max(0, now - state.lastSampleAt)
  let progress = state.progress + deltaPx / span

  let lockedDir = state.lockedDir
  if (lockedDir === null) {
    if (Math.abs(progress) * span >= PAGE_TURN_POLICY.directionLockPx) {
      lockedDir = progress >= 0 ? 1 : -1
    }
  } else {
    if (progress > 0 && lockedDir === -1) lockedDir = 1
    if (progress < 0 && lockedDir === 1) lockedDir = -1
    if (progress === 0) lockedDir = null
  }

  progress = clampProgress(progress)
  const sampleV = dtMs > 0 ? deltaPx / span / (dtMs / 1000) : 0
  const velocity = emaVelocity(state.velocity, sampleV, dtMs || 16)

  if (Math.abs(progress) >= 1) {
    const dir: TurnDirection = progress > 0 ? 1 : -1
    return {
      state: {
        ...state,
        phase: "settling",
        progress,
        velocity,
        lockedDir: dir,
        settleTarget: dir,
        lastSampleAt: now,
      },
      decision: {
        kind: "commit",
        fromIndex: state.baseIndex,
        toIndex: state.baseIndex + dir,
        progress,
        velocity,
      },
    }
  }

  return {
    state: {
      ...state,
      phase: "tracking",
      progress,
      velocity,
      lockedDir,
      lastSampleAt: now,
    },
    decision: { kind: "none" },
  }
}

export function handleReducedWheel(
  state: GestureSnapshot,
  deltaPx: number,
  now: number,
  pageCount: number,
): GestureStep {
  if (pageCount <= 1) {
    return {
      state: createIdleGesture(state.baseIndex, now),
      decision: { kind: "none" },
    }
  }
  if (state.phase === "reduced_fade" || state.phase === "cooldown") {
    return { state, decision: { kind: "none" } }
  }
  const pxAcc =
    state.phase === "tracking" ? state.wheelAccPx + deltaPx : deltaPx

  if (Math.abs(pxAcc) < PAGE_TURN_POLICY.coarseBurstPx) {
    return {
      state: {
        ...state,
        phase: "tracking",
        progress: 0,
        velocity: 0,
        wheelAccPx: pxAcc,
        lockedDir: null,
        lastSampleAt: now,
      },
      decision: { kind: "none" },
    }
  }

  const dir: TurnDirection = pxAcc > 0 ? 1 : -1
  const toIndex = wrapPageIndex(state.baseIndex + dir, pageCount)
  if (toIndex === state.baseIndex) {
    return {
      state: createIdleGesture(state.baseIndex, now),
      decision: { kind: "none" },
    }
  }
  return {
    state: {
      ...createIdleGesture(state.baseIndex, now),
      phase: "reduced_fade",
      baseIndex: state.baseIndex,
      targetIndex: toIndex,
      reducedFadeFrom: state.baseIndex,
      reducedFadeTo: toIndex,
      reducedFadeStartAt: now,
      cooldownUntil: now + PAGE_TURN_POLICY.cooldownMs,
    },
    decision: {
      kind: "commit",
      fromIndex: state.baseIndex,
      toIndex,
      progress: dir,
      velocity: 0,
    },
  }
}
