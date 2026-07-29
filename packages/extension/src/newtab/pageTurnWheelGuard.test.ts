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

  test("Given never without OS reduce, When prefersReducedMotion, Then false so animation may run", () => {
    expect(prefersReducedMotion("never", () => ({ matches: false }))).toBe(
      false,
    )
  })

  test("Given never with OS reduce, When prefersReducedMotion, Then true because OS always wins", () => {
    // Given stored “始终动画” / never, When OS prefers-reduced-motion is on
    // Then Page Turn, chrome, Package flags, and any consumer of this seam must reduce
    expect(prefersReducedMotion("never", () => ({ matches: true }))).toBe(true)
  })

  test("Given system + matchMedia reduce, When prefersReducedMotion, Then true", () => {
    expect(prefersReducedMotion("system", () => ({ matches: true }))).toBe(true)
  })

  test("Given system without OS reduce, When prefersReducedMotion, Then false", () => {
    expect(prefersReducedMotion("system", () => ({ matches: false }))).toBe(
      false,
    )
  })

  test("Given force with OS not reducing, When prefersReducedMotion, Then true still", () => {
    expect(prefersReducedMotion("force", () => ({ matches: false }))).toBe(true)
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
