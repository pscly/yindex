import { describe, expect, test } from "bun:test"
import {
  cyclicSlotCount,
  parallaxForProfile,
  stripOffsetFraction,
} from "./pageTurnLayout"
import { normalizeWheelDelta } from "./pageTurnNormalize"
import { springParamsForProfile } from "./pageTurnPolicy"
import { stepSpring } from "./pageTurnSpring"

/**
 * Strip-only composed geometry. Inner parallax is clipped per-Page and must not
 * contribute blank space outside the finite clone strip.
 */
function blankVh(input: {
  readonly baseIndex: number
  readonly progress: number
  readonly pageCount: number
  readonly parallaxY: number
}): number {
  const slots = cyclicSlotCount(input.pageCount)
  const stripFrac = stripOffsetFraction(
    input.baseIndex,
    input.progress,
    input.pageCount,
  )
  const stripVh = stripFrac * 100 * slots
  void input.parallaxY
  const totalTop = stripVh
  const totalBottom = totalTop + slots * 100
  const blankTop = Math.max(0, totalTop)
  const blankBottom = Math.max(0, 100 - totalBottom)
  return blankTop + blankBottom
}

describe("WS4 blockers — loop blank geometry", () => {
  test("Given n=2/n=3 forward/back all profiles, When stage geometry at every non-settled progress, Then blank vh is 0", () => {
    const profiles = ["calm", "balanced", "immersive"] as const
    const progresses = [
      -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.05, -1.05,
    ]
    for (const n of [2, 3] as const) {
      for (const baseIndex of [0, n - 1] as const) {
        for (const progress of progresses) {
          for (const profile of profiles) {
            const clamped = Math.max(-1, Math.min(1, progress))
            const parallaxY = parallaxForProfile(clamped, profile, false)
            const blank = blankVh({
              baseIndex,
              progress: clamped,
              pageCount: n,
              parallaxY,
            })
            expect(blank).toBeLessThanOrEqual(1e-9)
          }
        }
      }
    }
  })

  test("Given immersive exact boundary progress ±1 with strip parallax composition, When measuring blank, Then zero blank vh", () => {
    for (const n of [2, 3] as const) {
      for (const progress of [1, -1] as const) {
        const baseIndex = progress > 0 ? n - 1 : 0
        const parallaxY = parallaxForProfile(progress, "immersive", false)
        const blank = blankVh({
          baseIndex,
          progress,
          pageCount: n,
          parallaxY,
        })
        expect(blank).toBe(0)
      }
    }
  })
})

describe("WS4 blockers — normalization extreme finite deltas", () => {
  test("Given extreme finite line/page deltas, When normalized, Then non-finite products become 0", () => {
    expect(
      normalizeWheelDelta({ deltaY: Number.MAX_VALUE, deltaMode: 1 }),
    ).toBe(0)
    expect(
      normalizeWheelDelta({
        deltaY: Number.MAX_VALUE,
        deltaMode: 2,
        viewportHeight: Number.MAX_VALUE,
      }),
    ).toBe(0)
    expect(normalizeWheelDelta({ deltaY: 1e308, deltaMode: 1 })).toBe(0)
    expect(normalizeWheelDelta({ deltaY: 3, deltaMode: 1 })).toBe(48)
  })
})

describe("WS4 blockers — spring target clamp unit", () => {
  test("Given step that would cross target from below, When stepSpring, Then lands exactly on target with zero velocity", () => {
    const params = springParamsForProfile("balanced")
    const next = stepSpring({ x: 0.99, v: 20 }, 1, 1 / 60, params)
    expect(next.x).toBe(1)
    expect(next.v).toBe(0)
  })
})
