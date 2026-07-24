import { createIdleGesture, enterCooldown } from "./pageTurnGesturePublic"
import type { GestureSnapshot } from "./pageTurnGestureTypes"
import { wrapPageIndex } from "./pageTurnLayout"
import type { SpringParams } from "./pageTurnPolicy"
import { type SpringState, springSettled, stepSpring } from "./pageTurnSpring"

export type SpringLoopCallbacks = {
  readonly isMounted: () => boolean
  readonly getGesture: () => GestureSnapshot
  readonly setGesture: (g: GestureSnapshot) => void
  readonly getSpring: () => SpringState
  readonly setSpring: (s: SpringState) => void
  readonly getParams: () => SpringParams
  readonly onSettled: (
    committed: boolean,
    targetIndex: number,
    now: number,
  ) => void
  readonly bump: () => void
}

export function createSpringLoop(): {
  readonly start: (cb: SpringLoopCallbacks) => void
  readonly stop: () => void
} {
  let rafId: number | null = null
  let lastMs = 0

  const stop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const start = (cb: SpringLoopCallbacks) => {
    stop()
    lastMs = 0
    const frame = (now: number) => {
      if (!cb.isMounted()) return
      const g = cb.getGesture()
      if (g.phase !== "settling") {
        rafId = null
        return
      }
      const last = lastMs
      lastMs = now
      const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 30)
      const next = stepSpring(
        cb.getSpring(),
        g.settleTarget,
        dt,
        cb.getParams(),
      )
      cb.setSpring(next)
      cb.setGesture({ ...g, progress: next.x })
      cb.bump()
      if (springSettled(next, g.settleTarget)) {
        const committed = g.settleTarget !== 0
        const rawTarget =
          g.targetIndex !== null
            ? g.targetIndex
            : g.baseIndex +
              (g.settleTarget > 0 ? 1 : g.settleTarget < 0 ? -1 : 0)
        cb.onSettled(committed, rawTarget, performance.now())
        rafId = null
        return
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
  }

  return { start, stop }
}

export function applySpringFinish(input: {
  readonly committed: boolean
  readonly targetIndex: number
  readonly now: number
  readonly pageCount: number
  readonly currentIndex: number
  readonly gesture: GestureSnapshot
}): {
  readonly index: number
  readonly gesture: GestureSnapshot
  readonly spring: SpringState
} {
  if (input.committed) {
    const wrapped = wrapPageIndex(input.targetIndex, input.pageCount)
    return {
      index: wrapped,
      gesture: enterCooldown(input.gesture, wrapped, input.now),
      spring: { x: 0, v: 0 },
    }
  }
  return {
    index: input.currentIndex,
    gesture: createIdleGesture(input.currentIndex, input.now),
    spring: { x: 0, v: 0 },
  }
}

export function armSpringFromGesture(
  gesture: GestureSnapshot,
  velocity: number,
): SpringState {
  return { x: gesture.progress, v: velocity }
}

export function bindSpringLoopDrivers(input: {
  readonly loop: ReturnType<typeof createSpringLoop>
  readonly isMounted: () => boolean
  readonly getGesture: () => GestureSnapshot
  readonly setGesture: (g: GestureSnapshot) => void
  readonly getSpring: () => SpringState
  readonly setSpring: (s: SpringState) => void
  readonly getParams: () => SpringParams
  readonly onSettled: SpringLoopCallbacks["onSettled"]
  readonly bump: () => void
}): void {
  input.loop.start({
    isMounted: input.isMounted,
    getGesture: input.getGesture,
    setGesture: input.setGesture,
    getSpring: input.getSpring,
    setSpring: input.setSpring,
    getParams: input.getParams,
    onSettled: input.onSettled,
    bump: input.bump,
  })
}
