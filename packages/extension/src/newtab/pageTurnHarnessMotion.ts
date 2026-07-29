import { createIdleGesture, stepGesture } from "./pageTurnGesture"
import {
  HARNESS_PAGE_COUNT,
  HARNESS_SPAN,
  blankStripVh,
  gestureOpts,
  logSection,
} from "./pageTurnHarnessBase"
import {
  parallaxOffset,
  reducedMotionOffsetFraction,
  stripOffsetFraction,
} from "./pageTurnLayout"
import { normalizeWheelDelta } from "./pageTurnNormalize"
import {
  PAGE_TURN_POLICY,
  SPRING_BASE,
  springParamsForProfile,
} from "./pageTurnPolicy"
import {
  integrateSpringToSettle,
  trajectoryHasOvershoot,
} from "./pageTurnSpring"
import { computePageTurnVisual } from "./pageTurnVisual"

export function runMotionProfiles(): readonly {
  readonly profile: string
  readonly overshoot: boolean
}[] {
  const rows = (["calm", "balanced", "immersive"] as const).map((profile) => {
    const params = springParamsForProfile(profile)
    const samples = integrateSpringToSettle({ x: 0.2, v: 0 }, 1, params)
    const overshoot = trajectoryHasOvershoot(samples, 0.2, 1)
    const last = samples[samples.length - 1] ?? 0
    const boundary = integrateSpringToSettle(
      { x: 1, v: 9.509998672048866 },
      1,
      params,
      { dtSec: 1 / 60 },
    )
    const boundaryOvershoot = trajectoryHasOvershoot(boundary, 1, 1, 0)
    return {
      profile,
      stiffness: params.stiffness,
      damping: params.damping,
      frames: samples.length,
      final: Number(last.toFixed(4)),
      overshoot: overshoot || boundaryOvershoot,
      boundaryMax: Math.max(...boundary),
      parallaxMax: profile === "immersive" ? 0.03 : 0,
      parallaxAt1: parallaxOffset(1, profile === "immersive" ? 0.03 : 0),
    }
  })
  logSection("motion-profiles", rows)
  return rows
}

export function runReducedMotionCase(): {
  readonly intermediateCount: number
  readonly fadeMs: number
} {
  let g = stepGesture(
    createIdleGesture(0, 0),
    {
      kind: "begin_reduced_fade",
      fromIndex: 0,
      toIndex: 1,
      now: 0,
    },
    gestureOpts(true),
  ).state
  const intermediates: unknown[] = []
  const times = [0, 35, 70, 105, PAGE_TURN_POLICY.reducedMotionMs] as const
  for (const t of times) {
    if (t >= PAGE_TURN_POLICY.reducedMotionMs) {
      const done = stepGesture(g, { kind: "tick", now: t }, gestureOpts(true))
      g = done.state
      intermediates.push({
        t,
        phase: g.phase,
        opacityFrom: 1,
        settledKind: done.decision.kind,
        settledIndex:
          done.decision.kind === "reduced_settled" ? done.decision.index : null,
      })
      continue
    }
    const visual = computePageTurnVisual({
      gesture: g,
      currentIndex: 0,
      pageCount: HARNESS_PAGE_COUNT,
      motionProfile: "balanced",
      reducedMotion: true,
      nowMs: t,
    })
    intermediates.push({
      t,
      phase: g.phase,
      opacityFrom: visual.fadeOpacity.from,
      opacityTo: visual.fadeOpacity.to,
      offsetY: visual.offsetY,
      parallaxY: visual.parallaxY,
      isTurning: visual.isTurning,
    })
  }
  const mid = reducedMotionOffsetFraction(0, 1, 0.5, HARNESS_PAGE_COUNT)
  const start = reducedMotionOffsetFraction(0, 1, 0, HARNESS_PAGE_COUNT)
  const end = reducedMotionOffsetFraction(0, 1, 1, HARNESS_PAGE_COUNT)
  logSection("reduced-motion", [
    {
      fadeMs: PAGE_TURN_POLICY.reducedMotionMs,
      midOffset: mid.offset,
      startOffset: start.offset,
      endOffset: end.offset,
      continuousMid:
        Math.abs(mid.offset - (start.offset + end.offset) / 2) < 1e-9,
      opacityFrom: mid.opacityFrom,
      opacityTo: mid.opacityTo,
      midOpacityStrictBetweenEndpoints:
        mid.opacityFrom > 0 &&
        mid.opacityFrom < 1 &&
        mid.opacityTo > 0 &&
        mid.opacityTo < 1,
      parallax: 0,
      intermediateSnapshots: intermediates,
    },
  ])
  return {
    intermediateCount: intermediates.length,
    fadeMs: PAGE_TURN_POLICY.reducedMotionMs,
  }
}

export function runSinglePageNoop(): {
  readonly wheelDecision: string
  readonly goByWouldPlan: boolean
} {
  const wheel = stepGesture(
    createIdleGesture(0, 0),
    { kind: "wheel", deltaPx: 400, now: 5 },
    gestureOpts(false, 1),
  )
  const visual = computePageTurnVisual({
    gesture: wheel.state,
    currentIndex: 0,
    pageCount: 1,
    motionProfile: "balanced",
    reducedMotion: false,
    nowMs: 5,
  })
  const reduced = stepGesture(
    createIdleGesture(0, 0),
    { kind: "wheel", deltaPx: 400, now: 10 },
    gestureOpts(true, 1),
  )
  const staleTracking = {
    ...createIdleGesture(0, 0),
    phase: "tracking" as const,
    progress: 0.5,
    lockedDir: 1 as const,
  }
  const staleTick = stepGesture(
    staleTracking,
    { kind: "tick", now: 50 },
    gestureOpts(false, 1),
  )
  const staleVisual = computePageTurnVisual({
    gesture: staleTick.state,
    currentIndex: 0,
    pageCount: 1,
    motionProfile: "balanced",
    reducedMotion: false,
    nowMs: 50,
  })
  logSection("single-page-noop", [
    {
      wheelDecision: wheel.decision.kind,
      wheelPhase: wheel.state.phase,
      offsetY: visual.offsetY,
      isTurning: visual.isTurning,
      reducedDecision: reduced.decision.kind,
      reducedPhase: reduced.state.phase,
      staleTickPhase: staleTick.state.phase,
      staleDecision: staleTick.decision.kind,
      staleOffsetY: staleVisual.offsetY,
      staleIsTurning: staleVisual.isTurning,
    },
  ])
  return { wheelDecision: wheel.decision.kind, goByWouldPlan: false }
}

export function runLoopBoundary(): {
  readonly lastToFirst: number
  readonly firstToLast: number
} {
  const lastToFirst = stripOffsetFraction(2, 1, 3) * 100
  const firstToLast = stripOffsetFraction(0, -1, 3) * 100
  const blankRows = ([2, 3] as const).flatMap((n) =>
    ([1, -1] as const).map((progress) => {
      const baseIndex = progress > 0 ? n - 1 : 0
      return {
        n,
        progress,
        blankVh: blankStripVh(baseIndex, progress, n),
        stripOffsetY: stripOffsetFraction(baseIndex, progress, n) * 100,
        parallaxInner: parallaxOffset(progress, 0.03),
      }
    }),
  )
  logSection("loop-boundary-projection", [
    {
      n: 3,
      lastToFirstOffsetY: lastToFirst,
      firstToLastOffsetY: firstToLast,
      withinStrip: Math.abs(lastToFirst) < 100 && Math.abs(firstToLast) < 100,
      blankProbes: blankRows,
      maxBlankVh: Math.max(...blankRows.map((r) => r.blankVh)),
    },
  ])
  return { lastToFirst, firstToLast } // loop offsets
}

export function runProbes(): void {
  const malformed = [
    normalizeWheelDelta({ deltaY: Number.NaN, deltaMode: 0 }),
    normalizeWheelDelta({ deltaY: Number.POSITIVE_INFINITY, deltaMode: 1 }),
    normalizeWheelDelta({ deltaY: 10, deltaMode: 99 }),
  ]
  const extreme = [
    normalizeWheelDelta({ deltaY: Number.MAX_VALUE, deltaMode: 1 }),
    normalizeWheelDelta({
      deltaY: Number.MAX_VALUE,
      deltaMode: 2,
      viewportHeight: Number.MAX_VALUE,
    }),
  ]
  logSection("probes-malformed-delta", [
    {
      nan: malformed[0],
      inf: malformed[1],
      badMode: malformed[2],
      extremeLine: extreme[0],
      extremePage: extreme[1],
      span: HARNESS_SPAN,
      policy: {
        directionLockPx: PAGE_TURN_POLICY.directionLockPx,
        commitProgress: PAGE_TURN_POLICY.commitProgress,
        cooldownMs: PAGE_TURN_POLICY.cooldownMs,
        idleReleaseMs: PAGE_TURN_POLICY.idleReleaseMs,
        reducedMotionMs: PAGE_TURN_POLICY.reducedMotionMs,
        spring: SPRING_BASE,
      },
    },
  ])
}
