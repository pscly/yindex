import {
  createIdleGesture,
  enterCooldown,
  stepGesture,
  wrapPageIndex,
} from "./pageTurnGesture"
import {
  HARNESS_PAGE_COUNT,
  HARNESS_SPAN,
  type HarnessFrame,
  gestureOpts,
  logSection,
} from "./pageTurnHarnessBase"
import { parallaxOffset } from "./pageTurnLayout"
import { normalizeWheelDelta } from "./pageTurnNormalize"
import { PAGE_TURN_POLICY, SPRING_BASE } from "./pageTurnPolicy"
import {
  integrateSpringToSettle,
  trajectoryHasOvershoot,
} from "./pageTurnSpring"

export function runTrackpadSequence(): {
  readonly finalIndex: number
  readonly overshoot: boolean
} {
  let g = createIdleGesture(0, 0)
  const frames: HarnessFrame[] = []
  let t = 0
  for (let i = 0; i < 12; i++) {
    t += 16
    const px = normalizeWheelDelta({ deltaY: 12, deltaMode: 0 })
    g = stepGesture(
      g,
      { kind: "wheel", deltaPx: px, now: t },
      gestureOpts(false),
    ).state
    if (i % 3 === 0 || i === 11) {
      frames.push({
        t,
        progress: Number(g.progress.toFixed(4)),
        index: g.baseIndex,
        phase: g.phase,
        overshoot: false,
        parallax: parallaxOffset(g.progress, 0.03),
      })
    }
  }
  t += PAGE_TURN_POLICY.idleReleaseMs
  g = stepGesture(g, { kind: "tick", now: t }, gestureOpts(false)).state
  frames.push({
    t,
    progress: Number(g.progress.toFixed(4)),
    index: g.baseIndex,
    phase: g.phase,
    overshoot: false,
    parallax: 0,
  })
  const samples = integrateSpringToSettle(
    { x: g.progress, v: g.velocity },
    1,
    SPRING_BASE,
  )
  const overshoot = trajectoryHasOvershoot(samples, g.progress, 1)
  const last = samples[samples.length - 1] ?? g.progress
  const toIndex = wrapPageIndex(1, HARNESS_PAGE_COUNT)
  g = enterCooldown(g, toIndex, t + samples.length * (1000 / 120))
  frames.push({
    t: t + samples.length,
    progress: Number(last.toFixed(4)),
    index: toIndex,
    phase: g.phase,
    overshoot,
    parallax: 0,
  })
  logSection("trackpad-sequence", frames)
  return { finalIndex: toIndex, overshoot }
}

export function runCoarseWheelBurst(): {
  readonly commits: number
  readonly cooldownBlocks: boolean
} {
  let g = createIdleGesture(0, 0)
  const frames: HarnessFrame[] = []
  let commits = 0
  const first = stepGesture(
    g,
    { kind: "wheel", deltaPx: HARNESS_SPAN * 1.2, now: 0 },
    gestureOpts(false),
  )
  g = first.state
  if (first.decision.kind === "commit") commits++
  frames.push({
    t: 0,
    progress: Number(g.progress.toFixed(4)),
    index: g.baseIndex,
    phase: g.phase,
    overshoot: false,
    parallax: 0,
  })
  g = enterCooldown(g, wrapPageIndex(1, HARNESS_PAGE_COUNT), 100)
  const blocked = stepGesture(
    g,
    { kind: "wheel", deltaPx: 500, now: 120 },
    gestureOpts(false),
  )
  if (blocked.decision.kind === "commit") commits++
  frames.push({
    t: 120,
    progress: blocked.state.progress,
    index: blocked.state.baseIndex,
    phase: blocked.state.phase,
    overshoot: false,
    parallax: 0,
  })
  logSection("coarse-wheel-burst", frames)
  return {
    commits,
    cooldownBlocks: blocked.decision.kind === "none",
  }
}

export function runOppositeInterrupt(): void {
  let g = createIdleGesture(0, 0)
  g = stepGesture(
    g,
    { kind: "wheel", deltaPx: 200, now: 10 },
    gestureOpts(false),
  ).state
  const before = g.progress
  g = stepGesture(
    g,
    { kind: "begin_settle", targetProgress: 1, targetIndex: 1, now: 20 },
    gestureOpts(false),
  ).state
  const interrupted = stepGesture(
    g,
    { kind: "wheel", deltaPx: -40, now: 30 },
    gestureOpts(false),
  )
  logSection("opposite-interrupt", [
    {
      beforeProgress: before,
      afterPhase: interrupted.state.phase,
      afterProgress: interrupted.state.progress,
      resumedTracking: interrupted.state.phase === "tracking",
      progressDecreased: interrupted.state.progress < before,
    },
  ])
}
