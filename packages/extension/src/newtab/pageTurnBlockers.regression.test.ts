import { describe, expect, test } from "bun:test"
import { createSequence, pageId } from "@yindex/domain"
import { syncPageTurnDocument } from "./pageTurnDocSync"
import {
  createIdleGesture,
  enterCooldown,
  progressSpanPx,
  stepGesture,
} from "./pageTurnGesture"
import { PAGE_TURN_POLICY, springParamsForProfile } from "./pageTurnPolicy"
import {
  type SettleRuntime,
  forceIdleAt,
  handleSpringSettled,
} from "./pageTurnSettle"
import { createSpringLoop } from "./pageTurnSpringLoop"
import { settlingGesture } from "./pageTurnTestUtil"

const VH = 1000
const SPAN = progressSpanPx(VH)

function opts(pageCount = 3, reduced = false) {
  return {
    viewportHeight: VH,
    pageCount,
    reducedMotion: reduced,
  }
}

describe("WS4 blockers — direction lock", () => {
  test("Given +20 lock then -25 reverse, When still under opposite 12px from neutral, Then lockedDir stays +1", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 20, now: 10 }, opts()).state
    expect(g.lockedDir).toBe(1)
    expect(g.progress * SPAN).toBeCloseTo(20, 5)
    g = stepGesture(g, { kind: "wheel", deltaPx: -25, now: 20 }, opts()).state
    expect(g.progress * SPAN).toBeCloseTo(-5, 5)
    expect(g.lockedDir).toBe(1)
  })

  test("Given locked +1 then opposite displacement reaches 12px past neutral, When wheel continues, Then relocks -1", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 20, now: 10 }, opts()).state
    g = stepGesture(g, { kind: "wheel", deltaPx: -20, now: 20 }, opts()).state
    expect(g.progress).toBeCloseTo(0, 5)
    expect(g.lockedDir).toBe(1)
    g = stepGesture(g, { kind: "wheel", deltaPx: -12, now: 30 }, opts()).state
    expect(g.lockedDir).toBe(-1)
  })
})

describe("WS4 blockers — burst cooldown long-tail", () => {
  test("Given continuous burst samples through cooldown expiry, When trailing sample arrives, Then exactly one commit", () => {
    let g = createIdleGesture(0, 0)
    const first = stepGesture(
      g,
      { kind: "wheel", deltaPx: SPAN * 1.2, now: 0 },
      opts(),
    )
    expect(first.decision.kind).toBe("commit")
    g = enterCooldown(first.state, 1, 100)
    for (const t of [120, 180, 240, 279] as const) {
      const step = stepGesture(
        g,
        { kind: "wheel", deltaPx: 80, now: t },
        opts(),
      )
      expect(step.decision.kind).toBe("none")
      g = step.state
    }
    g = stepGesture(g, { kind: "tick", now: 280 }, opts()).state
    const trailing = stepGesture(
      g,
      { kind: "wheel", deltaPx: SPAN * 1.2, now: 281 },
      opts(),
    )
    expect(trailing.decision.kind).toBe("none")
  })
})

describe("WS4 blockers — settle interruption direction selectivity", () => {
  test("Given settling to +1, When same-direction +30 wheel, Then remains settling", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 200, now: 10 }, opts()).state
    g = stepGesture(
      g,
      { kind: "begin_settle", targetProgress: 1, targetIndex: 1, now: 20 },
      opts(),
    ).state
    expect(g.phase).toBe("settling")
    const same = stepGesture(g, { kind: "wheel", deltaPx: 30, now: 30 }, opts())
    expect(same.state.phase).toBe("settling")
    expect(same.decision.kind).toBe("none")
  })

  test("Given settling to +1, When opposite -30 reaches lock threshold, Then enters tracking", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 200, now: 10 }, opts()).state
    g = stepGesture(
      g,
      { kind: "begin_settle", targetProgress: 1, targetIndex: 1, now: 20 },
      opts(),
    ).state
    const opp = stepGesture(g, { kind: "wheel", deltaPx: -30, now: 30 }, opts())
    expect(opp.state.phase).toBe("tracking")
  })

  test("Given settling host, When same-direction wheel arrives, Then host does not stop spring before policy", () => {
    const before = {
      ...createIdleGesture(0, 0),
      phase: "settling" as const,
      progress: 0.4,
      settleTarget: 1,
      targetIndex: 1,
      lockedDir: 1 as const,
      lastSampleAt: 20,
    }
    const step = stepGesture(
      before,
      { kind: "wheel", deltaPx: 30, now: 30 },
      opts(),
    )
    const stopCalls =
      before.phase === "settling" && step.state.phase !== "settling" ? 1 : 0
    expect(stopCalls).toBe(0)
    expect(step.state.phase).toBe("settling")
  })
})

describe("WS4 blockers — mode cleanup", () => {
  test("Given tracking gesture, When forceIdleAt for Edit/Settings, Then spring and gesture return to committed idle", () => {
    const gestureRef = {
      current: {
        ...createIdleGesture(1, 0),
        phase: "tracking" as const,
        progress: 0.2,
        lockedDir: 1 as const,
      },
    }
    const springRef = { current: { x: 0.2, v: 1.5 } }
    let stopCalls = 0
    let bumps = 0
    forceIdleAt(
      {
        gestureRef,
        springRef,
        stopRaf: () => {
          stopCalls += 1
        },
        bump: () => {
          bumps += 1
        },
      },
      1,
    )
    expect(stopCalls).toBe(1)
    expect(bumps).toBe(1)
    expect(gestureRef.current.phase).toBe("idle")
    expect(gestureRef.current.progress).toBe(0)
    expect(gestureRef.current.baseIndex).toBe(1)
    expect(springRef.current).toEqual({ x: 0, v: 0 })
  })
})

describe("WS4 blockers — document identity invalidation", () => {
  test("Given mid-spring, When Home document replaced with identical Page IDs, Then generation invalidates and old onSettled is no-op", () => {
    const seq = createSequence([pageId("a"), pageId("b"), pageId("c")])
    expect(seq.ok).toBe(true)
    if (!seq.ok) return
    const docA = {
      sequence: seq.value,
      pages: {},
      settings: {},
      lastPageId: null,
    }
    const docB = {
      sequence: seq.value,
      pages: {},
      settings: {},
      lastPageId: null,
    }
    const init = syncPageTurnDocument({
      doc: docA as never,
      pageCount: 3,
      currentIndex: 0,
      initialized: false,
      lastSeqKey: "",
      generation: 0,
      gesture: createIdleGesture(0, 0),
    })
    const settling = settlingGesture(0, 0.55, 1)
    const after = syncPageTurnDocument({
      doc: docB as never,
      pageCount: 3,
      currentIndex: 0,
      initialized: true,
      lastSeqKey: init.lastSeqKey,
      generation: init.generation,
      gesture: settling,
      lastDocRef: docA as never,
    })
    expect(after.invalidated).toBe(true)
    expect(after.generation).toBe(init.generation + 1)

    let notified = 0
    let index = 0
    const generationRef = { current: after.generation }
    const gestureRef = { current: after.gesture }
    const springRef = { current: { x: 0, v: 0 } }
    const indexRef = { current: 0 }
    const rt: SettleRuntime = {
      gestureRef,
      springRef,
      springParamsRef: { current: springParamsForProfile("balanced") },
      springLoop: createSpringLoop(),
      generationRef,
      indexRef,
      pageCount: 3,
      reducedMotion: false,
      isMounted: () => true,
      bump: () => {},
      stopRaf: () => {},
      setIndex: (i) => {
        index = i
      },
      notifyPage: () => {
        notified += 1
      },
    }
    handleSpringSettled(rt, true, 1, 999, init.generation)
    expect(notified).toBe(0)
    expect(index).toBe(0)
  })
})

// Keep PAGE_TURN_POLICY referenced for cooldown constants visibility in suite.
void PAGE_TURN_POLICY.idleReleaseMs
