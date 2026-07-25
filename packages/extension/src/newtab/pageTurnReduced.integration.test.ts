import { describe, expect, test } from "bun:test"
import { createIdleGesture, stepGesture } from "./pageTurnGesture"
import { type PageTurnHostDeps, hostTick } from "./pageTurnHost"
import {
  reducedMotionOffsetFraction,
  stripOffsetFraction,
} from "./pageTurnLayout"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"
import { TEST_VH, runHostReducedFade, visualOf } from "./pageTurnTestUtil"

describe("pageTurn reduced_fade — no-snap continuity", () => {
  test("Given reduced_fade 0→1 n=3, When t=0..settle inclusive, Then both Page layers crossfade continuously", () => {
    const { snapshots, bumpCount, settledIndex } = runHostReducedFade({
      pageCount: 3,
      fromIndex: 0,
      toIndex: 1,
      frameMs: 16,
    })

    const turning = snapshots.filter((s) => s.phase === "reduced_fade")
    const intermediate = turning.filter(
      (s) =>
        s.opacityFrom > 0.05 &&
        s.opacityFrom < 0.95 &&
        s.opacityTo > 0.05 &&
        s.opacityTo < 0.95,
    )
    expect(intermediate.length).toBeGreaterThanOrEqual(1)
    expect(bumpCount).toBeGreaterThan(2)

    const lastTurning = turning[turning.length - 1]
    expect(lastTurning).toBeDefined()
    if (lastTurning) {
      expect(lastTurning.t).toBeLessThan(PAGE_TURN_POLICY.reducedMotionMs)
      expect(lastTurning.t).toBeGreaterThanOrEqual(
        PAGE_TURN_POLICY.reducedMotionMs - 16,
      )
      expect(lastTurning.parallaxY).toBe(0)
    }
    expect(settledIndex).toBe(1)

    const terminal = reducedMotionOffsetFraction(0, 1, 1, 3)
    const dest = stripOffsetFraction(1, 0, 3)
    expect(terminal.offset).toBeCloseTo(stripOffsetFraction(0, 0, 3), 10)
    expect(terminal.opacityFrom).toBeCloseTo(0, 10)
    expect(terminal.opacityTo).toBeCloseTo(1, 10)

    const firstSettled = snapshots.find(
      (s) => s.phase !== "reduced_fade" && s.currentIndex === 1,
    )
    expect(firstSettled).toBeDefined()
    if (firstSettled) {
      expect(firstSettled.offsetY).toBeCloseTo(dest * 100, 5)
      expect(Math.abs(terminal.opacityTo - 1)).toBeLessThanOrEqual(
        1 / 255 + 1e-9,
      )
    }

    if (turning.length >= 2) {
      const startY = turning[0]?.offsetY ?? 0
      const endY = turning[turning.length - 1]?.offsetY ?? 0
      expect(endY).toBeCloseTo(startY, 10)
    }
    for (const s of turning) {
      expect(s.parallaxY).toBe(0)
      expect(s.opacityFrom + s.opacityTo).toBeCloseTo(1, 10)
    }

    const middle = intermediate.find(
      (snapshot) => snapshot.opacityFrom > 0.4 && snapshot.opacityFrom < 0.6,
    )
    expect(middle).toBeDefined()
    if (!middle) return
    expect(middle.fadeLayers).toEqual({
      outgoing: { index: 0, opacity: middle.opacityFrom },
      incoming: { index: 1, opacity: middle.opacityTo },
    })
  })

  test("Given hostTick mid reduced_fade, When state identity stable, Then bump still fires", () => {
    let gesture = stepGesture(
      createIdleGesture(0, 0),
      {
        kind: "begin_reduced_fade",
        fromIndex: 0,
        toIndex: 1,
        now: 0,
      },
      { viewportHeight: TEST_VH, pageCount: 3, reducedMotion: true },
    ).state
    let bumps = 0
    const deps: PageTurnHostDeps = {
      getGesture: () => gesture,
      setGesture: (g) => {
        gesture = g
      },
      pageCount: 3,
      reducedMotion: true,
      stopSpringRaf: () => {},
      startSettle: () => {},
      onIndexCommitted: () => {},
      bump: () => {
        bumps += 1
      },
      goBy: () => {},
      goToIndex: () => {},
      setSpringFromTracking: () => {},
    }
    hostTick(deps, 70)
    expect(bumps).toBe(1)
    const mid = visualOf(gesture, 0, 3, 70, true)
    expect(mid.fadeOpacity.from).toBeGreaterThan(0)
    expect(mid.fadeOpacity.from).toBeLessThan(1)
    expect(mid.fadeOpacity.to).toBeGreaterThan(0)
    expect(mid.fadeOpacity.to).toBeLessThan(1)
    expect(mid.fadeLayers).toEqual({
      outgoing: { index: 0, opacity: mid.fadeOpacity.from },
      incoming: { index: 1, opacity: mid.fadeOpacity.to },
    })
    expect(mid.isTurning).toBe(true)
  })

  test("Given reduced duration policy, When measured, Then within 120–160ms", () => {
    expect(PAGE_TURN_POLICY.reducedMotionMs).toBeGreaterThanOrEqual(120)
    expect(PAGE_TURN_POLICY.reducedMotionMs).toBeLessThanOrEqual(160)
  })
})
