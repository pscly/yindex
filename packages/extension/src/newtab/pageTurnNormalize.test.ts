import { describe, expect, test } from "bun:test"
import { normalizeWheelDelta } from "./pageTurnNormalize"

describe("normalizeWheelDelta", () => {
  test("Given pixel deltaMode, When deltaY=40, Then returns 40", () => {
    expect(normalizeWheelDelta({ deltaY: 40, deltaMode: 0 })).toBe(40)
  })

  test("Given line deltaMode, When deltaY=3, Then multiplies by 16", () => {
    expect(normalizeWheelDelta({ deltaY: 3, deltaMode: 1 })).toBe(48)
  })

  test("Given page deltaMode, When deltaY=1 and viewport 900, Then multiplies by viewport", () => {
    expect(
      normalizeWheelDelta({ deltaY: 1, deltaMode: 2, viewportHeight: 900 }),
    ).toBe(900)
  })

  test("Given page deltaMode without viewport, When deltaY=1, Then uses default 800", () => {
    expect(normalizeWheelDelta({ deltaY: 1, deltaMode: 2 })).toBe(800)
  })

  test("Given NaN deltaY, When normalize, Then returns 0", () => {
    expect(normalizeWheelDelta({ deltaY: Number.NaN, deltaMode: 0 })).toBe(0)
  })

  test("Given Infinity deltaY, When normalize, Then returns 0", () => {
    expect(
      normalizeWheelDelta({ deltaY: Number.POSITIVE_INFINITY, deltaMode: 0 }),
    ).toBe(0)
  })

  test("Given unknown deltaMode, When normalize, Then returns 0", () => {
    expect(normalizeWheelDelta({ deltaY: 100, deltaMode: 99 })).toBe(0)
  })

  test("Given negative trackpad pixel delta, When normalize, Then preserves sign", () => {
    expect(normalizeWheelDelta({ deltaY: -12.5, deltaMode: 0 })).toBe(-12.5)
  })
})
