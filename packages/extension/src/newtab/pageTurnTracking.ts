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

/**
 * Direction lock: once locked, crossing neutral starts a fresh opposite
 * accumulator (wheelAccPx). Relock only after >= directionLockPx opposite.
 */
function resolveLockedDir(
  state: GestureSnapshot,
  progress: number,
  span: number,
): { readonly lockedDir: TurnDirection | null; readonly wheelAccPx: number } {
  const lockPx = PAGE_TURN_POLICY.directionLockPx
  let lockedDir = state.lockedDir
  let wheelAccPx = state.wheelAccPx

  if (lockedDir === null) {
    if (Math.abs(progress) * span >= lockPx) {
      lockedDir = progress >= 0 ? 1 : -1
      wheelAccPx = 0
    }
    return { lockedDir, wheelAccPx }
  }

  const progressPx = progress * span
  const sameSide =
    (lockedDir === 1 && progressPx >= 0) ||
    (lockedDir === -1 && progressPx <= 0)

  if (sameSide) {
    // Still on locked side (including neutral): keep lock; reset reverse acc.
    return { lockedDir, wheelAccPx: 0 }
  }

  // Opposite side of neutral: accumulate reverse displacement from 0.
  const oppositePx = Math.abs(progressPx)
  if (oppositePx >= lockPx) {
    lockedDir = progressPx > 0 ? 1 : -1
    return { lockedDir, wheelAccPx: 0 }
  }
  return { lockedDir, wheelAccPx: progressPx }
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

  const lock = resolveLockedDir(state, progress, span)
  const lockedDir = lock.lockedDir
  const wheelAccPx = lock.wheelAccPx

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
        wheelAccPx: 0,
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
      wheelAccPx,
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
