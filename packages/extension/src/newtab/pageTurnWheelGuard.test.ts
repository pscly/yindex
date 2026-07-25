import { describe, expect, test } from "bun:test"
import {
  isFormControlTarget,
  isScrollableConsuming,
  prefersReducedMotion,
} from "./pageTurnWheelGuard"

describe("pageTurnWheelGuard", () => {
  test("Given null target, When isFormControlTarget, Then false", () => {
    expect(isFormControlTarget(null)).toBe(false)
  })

  test("Given null target, When isScrollableConsuming, Then false", () => {
    expect(isScrollableConsuming(null, 10)).toBe(false)
  })

  test("Given force reducedMotion, When prefersReducedMotion, Then true", () => {
    expect(prefersReducedMotion("force")).toBe(true)
  })

  test("Given never reducedMotion, When prefersReducedMotion, Then false", () => {
    expect(prefersReducedMotion("never", () => ({ matches: true }))).toBe(false)
  })

  test("Given system + matchMedia reduce, When prefersReducedMotion, Then true", () => {
    expect(prefersReducedMotion("system", () => ({ matches: true }))).toBe(true)
  })
})
