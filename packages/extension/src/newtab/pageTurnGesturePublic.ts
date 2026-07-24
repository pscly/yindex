import type { GestureSnapshot } from "./pageTurnGestureTypes"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"

export function createIdleGesture(index: number, now = 0): GestureSnapshot {
  return {
    phase: "idle",
    progress: 0,
    velocity: 0,
    wheelAccPx: 0,
    lockedDir: null,
    baseIndex: index,
    targetIndex: null,
    settleTarget: 0,
    cooldownUntil: 0,
    lastSampleAt: now,
    reducedFadeFrom: index,
    reducedFadeTo: index,
    reducedFadeStartAt: 0,
  }
}

export function progressSpanPx(viewportHeight: number): number {
  const vh =
    Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 800
  return vh * PAGE_TURN_POLICY.progressViewportFraction
}

export function shouldCommit(progress: number, velocity: number): boolean {
  const absP = Math.abs(progress)
  if (absP >= PAGE_TURN_POLICY.commitProgress) return true
  if (
    absP >= PAGE_TURN_POLICY.flickMinProgress &&
    Math.abs(velocity) >= PAGE_TURN_POLICY.flickMinVelocity
  ) {
    return Math.sign(velocity) === Math.sign(progress) || progress === 0
  }
  return false
}

export function enterCooldown(
  _state: GestureSnapshot,
  committedIndex: number,
  now: number,
): GestureSnapshot {
  return {
    ...createIdleGesture(committedIndex, now),
    phase: "cooldown",
    cooldownUntil: now + PAGE_TURN_POLICY.cooldownMs,
  }
}
