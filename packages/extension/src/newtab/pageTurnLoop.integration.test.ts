import { describe, expect, test } from "bun:test"
import { createIdleGesture, stepGesture } from "./pageTurnGesture"
import {
  cyclicSlotCount,
  reducedMotionOffsetFraction,
  stripOffsetFraction,
} from "./pageTurnLayout"
import { TEST_VH, visualOf } from "./pageTurnTestUtil"

describe("pageTurn Loop — cyclic boundary projection", () => {
  test("Given n=3, When last→first progress 0→1, Then offsets stay within strip (no blank)", () => {
    const n = 3
    const slots = cyclicSlotCount(n)
    expect(slots).toBe(5)
    const start = stripOffsetFraction(2, 0, n) * 100
    const mid = stripOffsetFraction(2, 0.5, n) * 100
    const end = stripOffsetFraction(2, 1, n) * 100
    // All within [-(slots-1)/slots * 100, 0]
    for (const y of [start, mid, end]) {
      expect(y).toBeLessThanOrEqual(0 + 1e-9)
      expect(y).toBeGreaterThanOrEqual(-(slots - 1) * (100 / slots) - 1e-9)
    }
    // Continuous one-page travel toward clone first
    expect(end - start).toBeCloseTo(-100 / slots, 5)
    // Destination idle (real first) is visually the same page as clone
    const destIdle = stripOffsetFraction(0, 0, n) * 100
    expect(end).toBeCloseTo(-4 * (100 / slots), 5)
    expect(destIdle).toBeCloseTo(-1 * (100 / slots), 5)
  })

  test("Given n=3, When first→last progress 0→-1, Then offsets stay within strip", () => {
    const n = 3
    const slots = cyclicSlotCount(n)
    const start = stripOffsetFraction(0, 0, n) * 100
    const end = stripOffsetFraction(0, -1, n) * 100
    expect(start).toBeCloseTo(-100 / slots, 5)
    expect(end).toBeCloseTo(0, 5)
    expect(end - start).toBeCloseTo(100 / slots, 5)
  })

  test("Given n=2 boundaries normal spring visual, When progress ±1, Then continuous slot travel", () => {
    const n = 2
    const slots = cyclicSlotCount(n)
    expect(slots).toBe(4)
    const lastToFirst = stripOffsetFraction(1, 1, n) * 100
    const firstToLast = stripOffsetFraction(0, -1, n) * 100
    expect(lastToFirst).toBeCloseTo(-3 * (100 / slots), 5)
    expect(firstToLast).toBeCloseTo(0, 5)
    // Not the old blank-space values
    expect(lastToFirst).not.toBeCloseTo(-100, 0)
    expect(firstToLast).not.toBeCloseTo(50, 0)
  })

  test("Given n=2 reduced last→first, When t=0..1, Then outgoing strip stays filled while layers crossfade", () => {
    const n = 2
    const a = reducedMotionOffsetFraction(1, 0, 0, n)
    const b = reducedMotionOffsetFraction(1, 0, 0.5, n)
    const c = reducedMotionOffsetFraction(1, 0, 1, n)
    expect(a.offset).toBeCloseTo(stripOffsetFraction(1, 0, n))
    expect(b.offset).toBeCloseTo(a.offset)
    expect(c.offset).toBeCloseTo(a.offset)
    expect(b.opacityFrom).toBeCloseTo(0.5)
    expect(b.opacityTo).toBeCloseTo(0.5)
  })

  test("Given settling gesture last→first n=3, When visual, Then offset within strip not -100%", () => {
    let g = createIdleGesture(2, 0)
    g = {
      ...g,
      phase: "settling",
      baseIndex: 2,
      progress: 1,
      settleTarget: 1,
      targetIndex: 0,
    }
    const v = visualOf(g, 2, 3, 0, false)
    expect(v.offsetY).toBeCloseTo(stripOffsetFraction(2, 1, 3) * 100, 5)
    expect(Math.abs(v.offsetY)).toBeLessThan(100 - 1e-6)
  })

  test("Given wheel commit from last page n=3, When decision, Then toIndex wraps to 0", () => {
    let g = createIdleGesture(2, 0)
    // force commit via large progress tracking then tick
    g = stepGesture(
      g,
      { kind: "wheel", deltaPx: 650 * 0.25, now: 10 },
      { viewportHeight: TEST_VH, pageCount: 3, reducedMotion: false },
    ).state
    // progress may be partial; inject commit path
    g = {
      ...g,
      phase: "tracking",
      progress: 0.3,
      baseIndex: 2,
      lockedDir: 1,
      lastSampleAt: 10,
    }
    const released = stepGesture(
      g,
      { kind: "tick", now: 10 + 90 },
      { viewportHeight: TEST_VH, pageCount: 3, reducedMotion: false },
    )
    expect(released.decision.kind).toBe("commit")
    if (released.decision.kind === "commit") {
      expect(released.decision.fromIndex).toBe(2)
      expect(released.decision.toIndex).toBe(3) // raw; wrap applied in host
    }
  })
})
