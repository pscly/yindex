import { describe, expect, test } from "bun:test"
import {
  createIdleGesture,
  enterCooldown,
  progressSpanPx,
  stepGesture,
} from "./pageTurnGesture"
import {
  parallaxOffset,
  reducedMotionOffsetFraction,
  stripOffsetFraction,
  wrapPageIndex,
} from "./pageTurnLayout"
import { normalizeWheelDelta } from "./pageTurnNormalize"
import { PAGE_TURN_POLICY, parallaxMaxForProfile } from "./pageTurnPolicy"

const VH = 1000
const SPAN = progressSpanPx(VH)
const PAGE_COUNT = 3

function opts(reduced = false) {
  return {
    viewportHeight: VH,
    pageCount: PAGE_COUNT,
    reducedMotion: reduced,
  }
}

describe("pageTurnGesture — normalize + progress", () => {
  test("Given trackpad pixels, When accumulating to 0.22 progress, Then idle release commits", () => {
    let g = createIdleGesture(0, 0)
    const step = stepGesture(
      g,
      { kind: "wheel", deltaPx: 143, now: 10 },
      opts(),
    )
    g = step.state
    expect(g.phase).toBe("tracking")
    expect(g.progress).toBeCloseTo(0.22, 2)
    expect(g.lockedDir).toBe(1)

    const released = stepGesture(
      g,
      { kind: "tick", now: 10 + PAGE_TURN_POLICY.idleReleaseMs },
      opts(),
    )
    expect(released.decision.kind).toBe("commit")
    if (released.decision.kind === "commit") {
      expect(released.decision.fromIndex).toBe(0)
      expect(released.decision.toIndex).toBe(1)
    }
  })

  test("Given small progress without velocity, When idle release, Then returns", () => {
    let g = createIdleGesture(1, 0)
    const step = stepGesture(
      g,
      { kind: "wheel", deltaPx: 32.5, now: 5 },
      opts(),
    )
    g = step.state
    expect(g.progress).toBeCloseTo(0.05, 2)
    const released = stepGesture(
      g,
      { kind: "tick", now: 5 + PAGE_TURN_POLICY.idleReleaseMs },
      opts(),
    )
    expect(released.decision.kind).toBe("return")
  })

  test("Given progress 0.1 with flick velocity, When idle release, Then commits", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 20, now: 0 }, opts()).state
    g = stepGesture(g, { kind: "wheel", deltaPx: 45, now: 50 }, opts()).state
    expect(g.progress).toBeCloseTo(65 / SPAN, 2)
    expect(Math.abs(g.velocity)).toBeGreaterThanOrEqual(
      PAGE_TURN_POLICY.flickMinVelocity,
    )
    const released = stepGesture(
      g,
      { kind: "tick", now: 50 + PAGE_TURN_POLICY.idleReleaseMs },
      opts(),
    )
    expect(released.decision.kind).toBe("commit")
  })
})

describe("pageTurnGesture — direction lock and interruption", () => {
  test("Given sub-lock scroll, When under 12px, Then lockedDir is null", () => {
    const g = stepGesture(
      createIdleGesture(0, 0),
      { kind: "wheel", deltaPx: 8, now: 1 },
      opts(),
    ).state
    expect(g.lockedDir).toBeNull()
    expect(Math.abs(g.progress) * SPAN).toBeLessThan(
      PAGE_TURN_POLICY.directionLockPx,
    )
  })

  test("Given settling toward next, When opposite wheel, Then re-enters tracking from current progress", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 200, now: 10 }, opts()).state
    g = stepGesture(
      g,
      { kind: "begin_settle", targetProgress: 1, targetIndex: 1, now: 20 },
      opts(),
    ).state
    expect(g.phase).toBe("settling")
    const interrupted = stepGesture(
      g,
      { kind: "wheel", deltaPx: -30, now: 30 },
      opts(),
    )
    expect(interrupted.state.phase).toBe("tracking")
    expect(interrupted.state.progress).toBeLessThan(g.progress)
  })
})

describe("pageTurnGesture — one burst one page + cooldown", () => {
  test("Given progress exceeds 1, When wheel continues, Then progress clamps to 1 and commits once", () => {
    let g = createIdleGesture(0, 0)
    const first = stepGesture(
      g,
      { kind: "wheel", deltaPx: SPAN * 1.5, now: 1 },
      opts(),
    )
    expect(first.decision.kind).toBe("commit")
    expect(first.state.progress).toBe(1)
    g = enterCooldown(
      { ...first.state, baseIndex: wrapPageIndex(1, PAGE_COUNT) },
      1,
      100,
    )
    const during = stepGesture(
      g,
      { kind: "wheel", deltaPx: 500, now: 120 },
      opts(),
    )
    expect(during.decision.kind).toBe("none")
    expect(during.state.phase).toBe("cooldown")
  })

  test("Given coarse wheel burst of 80px, When reduced motion off and single notch, Then progress is partial", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(
      g,
      { kind: "wheel", deltaPx: PAGE_TURN_POLICY.coarseBurstPx, now: 0 },
      opts(),
    ).state
    expect(g.progress).toBeCloseTo(PAGE_TURN_POLICY.coarseBurstPx / SPAN, 2)
  })
})

describe("pageTurnGesture — Loop adjacency offsets", () => {
  test("Given 3 pages cyclic strip, When stripOffsetFraction, Then slot+1 projection", () => {
    // slots=5; real page i at slot i+1 → fraction -(i+1)/5
    expect(stripOffsetFraction(2, 0, 3)).toBeCloseTo(-3 / 5)
    expect(stripOffsetFraction(0, 0.5, 3)).toBeCloseTo(-1.5 / 5)
  })

  test("Given wrapPageIndex, When +1 from last, Then 0", () => {
    expect(wrapPageIndex(2 + 1, 3)).toBe(0)
    expect(wrapPageIndex(0 - 1, 3)).toBe(2)
  })

  test("Given last→first progress=1, When stripOffsetFraction, Then one page past last (clone first)", () => {
    // base 2 + progress 1 → slot 4 of 5 = -0.8 (clone of first)
    expect(stripOffsetFraction(2, 1, 3)).toBeCloseTo(-4 / 5)
    // first→last progress=-1 → slot 0 of 5 = 0 (clone of last)
    expect(stripOffsetFraction(0, -1, 3)).toBeCloseTo(0)
  })
})

describe("pageTurnGesture — reduced motion", () => {
  test("Given reduced motion, When coarse 80px burst, Then commits to reduced_fade", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(g, { kind: "wheel", deltaPx: 40, now: 0 }, opts(true)).state
    expect(g.phase).toBe("tracking")
    expect(g.wheelAccPx).toBe(40)
    const commit = stepGesture(
      g,
      { kind: "wheel", deltaPx: 50, now: 20 },
      opts(true),
    )
    expect(commit.decision.kind).toBe("commit")
    expect(commit.state.phase).toBe("reduced_fade")
    if (commit.decision.kind === "commit") {
      expect(commit.decision.toIndex).toBe(1)
    }
  })

  test("Given reduced fade, When duration elapses, Then reduced_settled at target", () => {
    let g = createIdleGesture(0, 0)
    g = stepGesture(
      g,
      {
        kind: "begin_reduced_fade",
        fromIndex: 0,
        toIndex: 1,
        now: 0,
      },
      opts(true),
    ).state
    const mid = stepGesture(g, { kind: "tick", now: 70 }, opts(true))
    expect(mid.decision.kind).toBe("none")
    const done = stepGesture(
      g,
      { kind: "tick", now: PAGE_TURN_POLICY.reducedMotionMs },
      opts(true),
    )
    expect(done.decision.kind).toBe("reduced_settled")
    if (done.decision.kind === "reduced_settled") {
      expect(done.decision.index).toBe(1)
    }
  })

  test("Given reduced motion offset, When t=0.5, Then outgoing strip remains still with crossfade opacities", () => {
    const r = reducedMotionOffsetFraction(0, 1, 0.5, 3)
    const start = stripOffsetFraction(0, 0, 3)
    expect(r.offset).toBeCloseTo(start)
    expect(r.opacityFrom).toBeCloseTo(0.5)
    expect(r.opacityTo).toBeCloseTo(0.5)
  })

  test("Given reduced motion last→first, When t=1, Then outgoing strip remains filled through the terminal fade", () => {
    const r = reducedMotionOffsetFraction(2, 0, 1, 3)
    expect(r.offset).toBeCloseTo(stripOffsetFraction(2, 0, 3))
    expect(r.opacityFrom).toBeCloseTo(0)
    expect(r.opacityTo).toBeCloseTo(1)
  })
})

describe("pageTurnGesture — motion profile parallax", () => {
  test("Given immersive progress 1, When parallaxOffset, Then abs <= 0.03", () => {
    const max = parallaxMaxForProfile("immersive")
    expect(Math.abs(parallaxOffset(1, max))).toBeLessThanOrEqual(0.03)
    expect(parallaxOffset(0.5, parallaxMaxForProfile("calm"))).toBe(0)
    expect(parallaxOffset(0.5, parallaxMaxForProfile("balanced"))).toBe(0)
  })
})

describe("pageTurnGesture — deltaMode chain", () => {
  test("Given line-mode wheel, When normalized and applied, Then progress uses px", () => {
    const px = normalizeWheelDelta({ deltaY: 3, deltaMode: 1 })
    expect(px).toBe(48)
    const g = stepGesture(
      createIdleGesture(0, 0),
      { kind: "wheel", deltaPx: px, now: 1 },
      opts(),
    ).state
    expect(g.progress).toBeCloseTo(48 / SPAN, 3)
  })
})
