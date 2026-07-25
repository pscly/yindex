import {
  type GestureSnapshot,
  createIdleGesture,
  stepGesture,
} from "./pageTurnGesture"
import { type PageTurnHostDeps, hostTick } from "./pageTurnHost"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"
import { computePageTurnVisual } from "./pageTurnVisual"

export const TEST_VH = 1000

export function visualOf(
  gesture: GestureSnapshot,
  currentIndex: number,
  pageCount: number,
  nowMs: number,
  reducedMotion: boolean,
) {
  return computePageTurnVisual({
    gesture,
    currentIndex,
    pageCount,
    motionProfile: "balanced",
    reducedMotion,
    nowMs,
  })
}

export function runHostReducedFade(input: {
  readonly pageCount: number
  readonly fromIndex: number
  readonly toIndex: number
  readonly frameMs: number
}): {
  readonly snapshots: readonly {
    readonly t: number
    readonly opacityFrom: number
    readonly opacityTo: number
    readonly fadeLayers: ReturnType<typeof visualOf>["fadeLayers"]
    readonly offsetY: number
    readonly parallaxY: number
    readonly isTurning: boolean
    readonly phase: string
    readonly currentIndex: number
  }[]
  readonly bumpCount: number
  readonly settledIndex: number | null
} {
  let gesture = createIdleGesture(input.fromIndex, 0)
  let currentIndex = input.fromIndex
  let settledIndex: number | null = null
  let bumpCount = 0
  const snapshots: {
    readonly t: number
    readonly opacityFrom: number
    readonly opacityTo: number
    readonly fadeLayers: ReturnType<typeof visualOf>["fadeLayers"]
    readonly offsetY: number
    readonly parallaxY: number
    readonly isTurning: boolean
    readonly phase: string
    readonly currentIndex: number
  }[] = []

  const record = (t: number) => {
    const v = visualOf(gesture, currentIndex, input.pageCount, t, true)
    const turning = v.isTurning && gesture.phase === "reduced_fade"
    snapshots.push({
      t,
      opacityFrom: v.fadeOpacity.from,
      opacityTo: v.fadeOpacity.to,
      fadeLayers: v.fadeLayers,
      offsetY: v.offsetY,
      parallaxY: v.parallaxY,
      isTurning: v.isTurning,
      phase: gesture.phase,
      currentIndex,
    })
  }

  const deps: PageTurnHostDeps = {
    getGesture: () => gesture,
    setGesture: (g) => {
      gesture = g
    },
    pageCount: input.pageCount,
    reducedMotion: true,
    stopSpringRaf: () => {},
    startSettle: () => {},
    onIndexCommitted: (index) => {
      currentIndex = index
      settledIndex = index
    },
    bump: () => {
      bumpCount += 1
    },
    goBy: () => {},
    goToIndex: () => {},
    setSpringFromTracking: () => {},
  }

  const begin = stepGesture(
    gesture,
    {
      kind: "begin_reduced_fade",
      fromIndex: input.fromIndex,
      toIndex: input.toIndex,
      now: 0,
    },
    {
      viewportHeight: TEST_VH,
      pageCount: input.pageCount,
      reducedMotion: true,
    },
  )
  gesture = begin.state
  deps.bump()
  record(0)

  const endT = PAGE_TURN_POLICY.reducedMotionMs + input.frameMs
  for (let t = input.frameMs; t <= endT; t += input.frameMs) {
    const beforeBumps = bumpCount
    hostTick(deps, t)
    if (bumpCount > beforeBumps) {
      record(t)
    }
  }

  return { snapshots, bumpCount, settledIndex }
}

export function trackingGesture(
  baseIndex: number,
  progress: number,
): GestureSnapshot {
  return {
    ...createIdleGesture(baseIndex, 0),
    phase: "tracking",
    progress,
    baseIndex,
    lockedDir: progress >= 0 ? 1 : -1,
    lastSampleAt: 0,
  }
}

export function settlingGesture(
  baseIndex: number,
  progress: number,
  targetIndex: number,
): GestureSnapshot {
  return {
    ...createIdleGesture(baseIndex, 0),
    phase: "settling",
    progress,
    baseIndex,
    settleTarget: Math.sign(progress) || 1,
    targetIndex,
    lockedDir: progress >= 0 ? 1 : -1,
    lastSampleAt: 0,
  }
}
