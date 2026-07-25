import { describe, expect, test } from "bun:test"
import {
  ambientMotionAllowed,
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

  test("Given OS reduce and stored never, When ambient motion resolves, Then OS wins", () => {
    // Given / When
    const allowed = ambientMotionAllowed("never", () => ({ matches: true }))

    // Then
    expect(allowed).toBe(false)
  })

  test("Given product force, When ambient motion resolves without OS reduce, Then it stops", () => {
    // Given / When
    const allowed = ambientMotionAllowed("force", () => ({ matches: false }))

    // Then
    expect(allowed).toBe(false)
  })

  test("Given system preference, When ambient motion resolves, Then it follows OS", () => {
    expect(ambientMotionAllowed("system", () => ({ matches: false }))).toBe(
      true,
    )
    expect(ambientMotionAllowed("system", () => ({ matches: true }))).toBe(
      false,
    )
  })
})
