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
  for (const t of [120, 180, 240, 279] as const) {
    const blocked = stepGesture(
      g,
      { kind: "wheel", deltaPx: 80, now: t },
      gestureOpts(false),
    )
    if (blocked.decision.kind === "commit") commits++
    g = blocked.state
    frames.push({
      t,
      progress: blocked.state.progress,
      index: blocked.state.baseIndex,
      phase: blocked.state.phase,
      overshoot: false,
      parallax: 0,
    })
  }
  g = stepGesture(g, { kind: "tick", now: 280 }, gestureOpts(false)).state
  const trailing = stepGesture(
    g,
    { kind: "wheel", deltaPx: HARNESS_SPAN * 1.2, now: 281 },
    gestureOpts(false),
  )
  if (trailing.decision.kind === "commit") commits++
  frames.push({
    t: 281,
    progress: trailing.state.progress,
    index: trailing.state.baseIndex,
    phase: trailing.state.phase,
    overshoot: false,
    parallax: 0,
  })
  logSection("coarse-wheel-burst", frames)
  return {
    commits,
    cooldownBlocks: trailing.decision.kind === "none" && commits === 1,
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
  const same = stepGesture(
    g,
    { kind: "wheel", deltaPx: 30, now: 25 },
    gestureOpts(false),
  )
  const interrupted = stepGesture(
    g,
    { kind: "wheel", deltaPx: -40, now: 30 },
    gestureOpts(false),
  )
  // Direction lock reverse probe: +20 then -25 must keep lockedDir +1
  let lock = createIdleGesture(0, 0)
  lock = stepGesture(
    lock,
    { kind: "wheel", deltaPx: 20, now: 10 },
    gestureOpts(false),
  ).state
  lock = stepGesture(
    lock,
    { kind: "wheel", deltaPx: -25, now: 20 },
    gestureOpts(false),
  ).state
  logSection("opposite-interrupt", [
    {
      beforeProgress: before,
      sameDirPhase: same.state.phase,
      sameDirAbsorbed: same.state.phase === "settling",
      afterPhase: interrupted.state.phase,
      afterProgress: interrupted.state.progress,
      resumedTracking: interrupted.state.phase === "tracking",
      progressDecreased: interrupted.state.progress < before,
      reverseLockDir: lock.lockedDir,
      reverseKeepsForward: lock.lockedDir === 1,
    },
  ])
}
