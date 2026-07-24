import { describe, expect, test } from "bun:test"
import {
  DEFAULT_GLASS_TUNING,
  GLASS_PROFILE_BASE,
  createGlassTuning,
  resolveGlass,
} from "./glass"

describe("Glass profile and protected tuning", () => {
  test("resolveGlass atomically falls back after one read of each hostile tuning getter", () => {
    // Given — valid non-default siblings expose partial fallback
    let transmissionReads = 0
    let blurReads = 0
    let saturationReads = 0
    let highlightReads = 0
    const forgedTuning = {
      get transmission() {
        transmissionReads += 1
        return 0.15
      },
      get blur() {
        blurReads += 1
        return 5
      },
      get saturation() {
        saturationReads += 1
        return Number.POSITIVE_INFINITY
      },
      get highlight() {
        highlightReads += 1
        return Number.NaN
      },
    }

    // When
    const glass = resolveGlass("balanced", forgedTuning)

    // Then — no valid sibling survives the invalid object
    expect([
      transmissionReads,
      blurReads,
      saturationReads,
      highlightReads,
    ]).toEqual([1, 1, 1, 1])
    expect(glass.blurPx).toBe(GLASS_PROFILE_BASE.balanced.blurPx)
    expect(glass.opacity).toBe(GLASS_PROFILE_BASE.balanced.opacity)
    expect(glass.highlight).toBe(GLASS_PROFILE_BASE.balanced.highlight)
    expect(glass.saturation).toBe(GLASS_PROFILE_BASE.balanced.saturation)
    expect(glass.tuning).toEqual(DEFAULT_GLASS_TUNING)
  })

  test("resolveGlass maps balanced to base blur band", () => {
    // Given
    const tuningR = createGlassTuning({})
    if (!tuningR.ok) throw new Error("tuning")
    // When
    const glass = resolveGlass("balanced", tuningR.value)
    // Then
    expect(glass.profile).toBe("balanced")
    expect(glass.enabled).toBe(true)
    expect(glass.blurPx).toBe(GLASS_PROFILE_BASE.balanced.blurPx)
    expect(glass.opacity).toBe(GLASS_PROFILE_BASE.balanced.opacity)
  })

  test("protected tuning cannot move clear glass outside its hard blur band", () => {
    // Given / When
    const bad = createGlassTuning({ blur: 99 })
    const good = createGlassTuning({ blur: 4, transmission: 0.05 })
    // Then
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.code).toBe("invalid_tuning")
    expect(good.ok).toBe(true)
    if (good.ok) {
      const glass = resolveGlass("clear", good.value)
      expect(glass.blurPx).toBe(18)
    }
  })

  test("resolveGlass clamps every profile to its blur and tint bands", () => {
    // Given
    const cases = [
      {
        profile: "clear",
        blur: { min: 14, max: 18 },
        tint: { min: 0.08, max: 0.14 },
      },
      {
        profile: "balanced",
        blur: { min: 22, max: 28 },
        tint: { min: 0.16, max: 0.24 },
      },
      {
        profile: "deep",
        blur: { min: 30, max: 40 },
        tint: { min: 0.28, max: 0.4 },
      },
    ] as const
    const lowR = createGlassTuning({ blur: -12, transmission: 0.2 })
    const highR = createGlassTuning({ blur: 12, transmission: -0.2 })
    if (!lowR.ok || !highR.ok) throw new Error("tuning")

    // When / Then
    for (const { profile, blur, tint } of cases) {
      const low = resolveGlass(profile, lowR.value)
      const high = resolveGlass(profile, highR.value)
      expect(low.blurPx).toBeGreaterThanOrEqual(blur.min)
      expect(high.blurPx).toBeLessThanOrEqual(blur.max)
      expect(low.opacity).toBeGreaterThanOrEqual(tint.min)
      expect(high.opacity).toBeLessThanOrEqual(tint.max)
    }
  })
})
