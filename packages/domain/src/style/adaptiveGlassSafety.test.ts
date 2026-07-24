import { describe, expect, test } from "bun:test"
import { BALANCED_SAFE_ANALYSIS, solveAdaptiveGlass } from "./adaptiveGlass"
import {
  assertFiniteMaterial,
  assertProfileBand,
  assertTextFloors,
  contrastFromL,
  mustInput,
  srgbRelL,
} from "./adaptiveGlassTestSupport"
import { DEFAULT_GLASS_TUNING, createGlassTuning } from "./glass"

describe("Public solve trust boundary (non-finite / out-of-range)", () => {
  test("NaN analysis falls back safely — no NaN contrast emission", () => {
    // Given — old regression: raw NaN passed through and polluted material
    const poisoned = {
      luminance: Number.NaN,
      chroma: 0.2,
      detail: 0.2,
    }
    // When — public path accepts structural shape but must not trust values
    const glass = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis: poisoned,
    })
    // Then
    expect(glass.adaptive.usedFallback).toBe(true)
    expect(glass.adaptive.analysis.luminance).toBe(
      BALANCED_SAFE_ANALYSIS.luminance,
    )
    expect(Number.isFinite(glass.adaptive.lens.contrastRatio)).toBe(true)
    expect(Number.isFinite(glass.adaptive.contentDirect.contrastRatio)).toBe(
      true,
    )
    expect(Number.isNaN(glass.adaptive.lens.contrastRatio)).toBe(false)
    expect(Number.isNaN(glass.adaptive.lens.effectiveBackgroundL)).toBe(false)
    assertTextFloors(glass.adaptive.lens)
    assertTextFloors(glass.adaptive.contentDirect)
  })

  test("Infinity and out-of-range analysis fall back without subfloor contrast", () => {
    // Given
    const cases = [
      { luminance: Number.POSITIVE_INFINITY, chroma: 0.1, detail: 0.1 },
      { luminance: 0.5, chroma: Number.NEGATIVE_INFINITY, detail: 0.1 },
      { luminance: 0.5, chroma: 0.1, detail: 2 },
      { luminance: -1, chroma: 0.1, detail: 0.1 },
    ] as const
    // When / Then
    for (const analysis of cases) {
      const glass = solveAdaptiveGlass({
        profile: "deep",
        tuning: DEFAULT_GLASS_TUNING,
        analysis,
      })
      expect(glass.adaptive.usedFallback).toBe(true)
      assertTextFloors(glass.adaptive.lens)
      assertTextFloors(glass.adaptive.contentDirect)
    }
  })

  test("NaN and Infinity analysis emit balanced-safe finite in-band tokens", () => {
    // Given
    const cases = [
      { luminance: Number.NaN, chroma: 0.1, detail: 0.1 },
      { luminance: 0.5, chroma: Number.POSITIVE_INFINITY, detail: 0.1 },
      { luminance: 0.5, chroma: 0.1, detail: Number.NEGATIVE_INFINITY },
    ] as const

    // When / Then
    for (const analysis of cases) {
      const glass = solveAdaptiveGlass({
        profile: "balanced",
        tuning: DEFAULT_GLASS_TUNING,
        analysis,
      })
      expect(glass.adaptive.usedFallback).toBe(true)
      expect(glass.adaptive.analysis).toEqual(BALANCED_SAFE_ANALYSIS)
      assertFiniteMaterial(glass)
      assertProfileBand("balanced", glass)
      assertTextFloors(glass.adaptive.lens)
      assertTextFloors(glass.adaptive.contentDirect)
    }
  })
})

describe("Adaptive Glass solver shared protections", () => {
  test("detail-boosted deep blur 44 is clamped to the 40px hard ceiling", () => {
    // Given — deep base 35 + detail boost 9 previously emitted 44px
    const analysis = mustInput({ luminance: 0.5, chroma: 0.1, detail: 0.9 })

    // When
    const glass = solveAdaptiveGlass({
      profile: "deep",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })

    // Then
    expect(glass.blurPx).toBe(40)
    assertProfileBand("deep", glass)
    assertTextFloors(glass.adaptive.lens)
    assertTextFloors(glass.adaptive.contentDirect)
  })

  test("full tuning and analysis cascade stays in every profile hard band", () => {
    // Given
    const lowR = createGlassTuning({ blur: -12, transmission: 0.2 })
    const highR = createGlassTuning({ blur: 12, transmission: -0.2 })
    if (!lowR.ok || !highR.ok) throw new Error("tuning")
    const cases = [
      { tuning: lowR.value, detail: 0 },
      { tuning: highR.value, detail: 1 },
    ] as const

    // When / Then
    for (const profile of ["clear", "balanced", "deep"] as const) {
      for (const { tuning, detail } of cases) {
        const glass = solveAdaptiveGlass({
          profile,
          tuning,
          analysis: mustInput({ luminance: 0.72, chroma: 0.15, detail }),
        })
        assertProfileBand(profile, glass)
        assertTextFloors(glass.adaptive.lens)
        assertTextFloors(glass.adaptive.contentDirect)
      }
    }
  })

  test("higher detail increases blur and tint/scrim protection vs flat peer", () => {
    // Given
    const flat = mustInput({ luminance: 0.7, chroma: 0.1, detail: 0.05 })
    const detailed = mustInput({ luminance: 0.7, chroma: 0.1, detail: 0.9 })
    // When
    const a = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis: flat,
    })
    const b = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis: detailed,
    })
    // Then — detail raises blur / shell thickness; tint floor grows with detail
    expect(b.blurPx).toBeGreaterThan(a.blurPx)
    expect(b.adaptive.lens.tintOpacity).toBeGreaterThanOrEqual(
      a.adaptive.lens.tintOpacity,
    )
    expect(b.opacity).toBeGreaterThanOrEqual(a.opacity)
    const mass = (g: typeof a) =>
      g.adaptive.lens.tintOpacity + g.adaptive.lens.scrimOpacity
    expect(mass(b)).toBeGreaterThanOrEqual(mass(a) - 0.05)
  })

  test("absent analysis falls back to balanced-safe material", () => {
    // Given / When
    const glass = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis: null,
    })
    // Then
    expect(glass.adaptive.usedFallback).toBe(true)
    expect(glass.adaptive.analysis.luminance).toBe(
      BALANCED_SAFE_ANALYSIS.luminance,
    )
    assertTextFloors(glass.adaptive.lens)
    assertTextFloors(glass.adaptive.contentDirect)
  })

  test("max transmission tuning cannot drop normal or muted text below 4.5:1", () => {
    // Given — try to blow open the glass on a mid-detail bright field
    const tuningR = createGlassTuning({
      transmission: 0.2,
      blur: -12,
      highlight: -0.25,
      saturation: -0.4,
    })
    if (!tuningR.ok) throw new Error("tuning")
    const analysis = mustInput({ luminance: 0.75, chroma: 0.2, detail: 0.55 })
    // When
    const glass = solveAdaptiveGlass({
      profile: "clear",
      tuning: tuningR.value,
      analysis,
    })
    // Then — system scrim/floor wins on both surfaces
    assertTextFloors(glass.adaptive.lens)
    assertTextFloors(glass.adaptive.contentDirect)
  })

  test("independent sRGB black-on-white contrast is 21 (calibration of test harness)", () => {
    const black = srgbRelL("#000000")
    const white = srgbRelL("#ffffff")
    expect(contrastFromL(black, white)).toBeCloseTo(21, 5)
  })

  test("deep profile starts thicker than clear under same analysis", () => {
    // Given
    const analysis = mustInput({ luminance: 0.5, chroma: 0.15, detail: 0.3 })
    // When
    const clear = solveAdaptiveGlass({
      profile: "clear",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    const deep = solveAdaptiveGlass({
      profile: "deep",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    // Then
    expect(deep.blurPx).toBeGreaterThan(clear.blurPx)
    expect(deep.opacity).toBeGreaterThan(clear.opacity)
  })

  test("matrix: bright/dark × flat/detailed × profiles keep both branches >=4.5", () => {
    // Given
    const luminances = [0.12, 0.48, 0.88] as const
    const details = [0.05, 0.9] as const
    const profiles = ["clear", "balanced", "deep"] as const
    // When / Then
    for (const luminance of luminances) {
      for (const detail of details) {
        for (const profile of profiles) {
          const analysis = mustInput({ luminance, chroma: 0.12, detail })
          const glass = solveAdaptiveGlass({
            profile,
            tuning: DEFAULT_GLASS_TUNING,
            analysis,
          })
          assertTextFloors(glass.adaptive.lens)
          assertTextFloors(glass.adaptive.contentDirect)
        }
      }
    }
  })

  test("determinism: identical inputs yield identical dual-branch material", () => {
    // Given
    const analysis = mustInput({ luminance: 0.61, chroma: 0.11, detail: 0.4 })
    // When
    const a = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    const b = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    // Then
    expect(a.adaptive).toEqual(b.adaptive)
    expect(a.blurPx).toBe(b.blurPx)
  })
})
