import { createIdleGesture, stepGesture } from "./pageTurnGesture"
import {
  HARNESS_PAGE_COUNT,
  HARNESS_SPAN,
  HARNESS_VH,
  logSection,
} from "./pageTurnHarnessBase"
import {
  runCoarseWheelBurst,
  runOppositeInterrupt,
  runTrackpadSequence,
} from "./pageTurnHarnessGesture"
import {
  runLoopBoundary,
  runMotionProfiles,
  runProbes,
  runReducedMotionCase,
  runSinglePageNoop,
} from "./pageTurnHarnessMotion"
import {
  reducedMotionOffsetFraction,
  stripOffsetFraction,
} from "./pageTurnLayout"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"
import { computePageTurnVisual } from "./pageTurnVisual"

function logComputedSections(): void {
  const fadeMs = PAGE_TURN_POLICY.reducedMotionMs
  const frames = ([0, 0.25, 0.5, 0.75, 1] as const).map((t) => {
    const r = reducedMotionOffsetFraction(0, 1, t, 3)
    return {
      t,
      offsetY: r.offset * 100,
      opacityFrom: r.opacityFrom,
      opacityTo: r.opacityTo,
    }
  })
  const destOffsetY = stripOffsetFraction(1, 0, 3) * 100
  const terminal = frames[frames.length - 1]
  logSection("reduced intermediate continuity (computed)", [
    {
      fadeMs,
      frames,
      destOffsetY,
      terminalMatchesDest:
        terminal !== undefined &&
        Math.abs(terminal.offsetY - destOffsetY) < 1e-9,
      offsetDeltaTerminalToDest:
        terminal !== undefined
          ? Math.abs(terminal.offsetY - destOffsetY)
          : null,
      outgoingTerminalOpacity: terminal?.opacityFrom ?? null,
      incomingTerminalOpacity: terminal?.opacityTo ?? null,
    },
  ])

  const staleTracking = {
    ...createIdleGesture(0, 0),
    phase: "tracking" as const,
    progress: 0.55,
    lockedDir: 1 as const,
  }
  const staleStep = stepGesture(
    staleTracking,
    { kind: "tick", now: 80 },
    {
      viewportHeight: HARNESS_VH,
      pageCount: 1,
      reducedMotion: false,
    },
  )
  const staleVisual = computePageTurnVisual({
    gesture: staleStep.state,
    currentIndex: 0,
    pageCount: 1,
    motionProfile: "balanced",
    reducedMotion: false,
    nowMs: 80,
  })
  logSection("single-page stale no-op (computed)", [
    {
      decision: staleStep.decision.kind,
      phase: staleStep.state.phase,
      offsetY: staleVisual.offsetY,
      isTurning: staleVisual.isTurning,
    },
  ])

  logSection("loop boundary projection (computed)", [
    {
      n3_lastToFirst: stripOffsetFraction(2, 1, 3) * 100,
      n3_firstToLast: stripOffsetFraction(0, -1, 3) * 100,
      n2_lastToFirst: stripOffsetFraction(1, 1, 2) * 100,
      n2_firstToLast: stripOffsetFraction(0, -1, 2) * 100,
    },
  ])
}

function main(): void {
  console.log("# WS4 Page Turn physics harness")
  console.log(
    `viewportHeight=${HARNESS_VH} spanPx=${HARNESS_SPAN} pageCount=${HARNESS_PAGE_COUNT}`,
  )
  const trackpad = runTrackpadSequence()
  const coarse = runCoarseWheelBurst()
  runOppositeInterrupt()
  const profiles = runMotionProfiles()
  const reduced = runReducedMotionCase()
  const single = runSinglePageNoop()
  const loop = runLoopBoundary()
  runProbes()
  logComputedSections()
  console.log("\n## summary")
  console.log(
    JSON.stringify({
      trackpadFinalIndex: trackpad.finalIndex,
      trackpadOvershoot: trackpad.overshoot,
      coarseCommits: coarse.commits,
      cooldownBlocks: coarse.cooldownBlocks,
      allProfilesNoOvershoot: profiles.every((p) => !p.overshoot),
      reducedFadeMs: reduced.fadeMs,
      reducedIntermediateCount: reduced.intermediateCount,
      singlePageWheelNone: single.wheelDecision === "none",
      loopLastToFirst: loop.lastToFirst,
      loopFirstToLast: loop.firstToLast,
      promptInjection: "N/A",
      hungCommands: "N/A",
    }),
  )
}

main()
