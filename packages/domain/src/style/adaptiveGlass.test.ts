import { describe, expect, test } from "bun:test"
import {
  MIN_TEXT_CONTRAST,
  parseAdaptiveGlassInput,
  solveAdaptiveGlass,
} from "./adaptiveGlass"
import {
  assertFiniteMaterial,
  assertTextFloors,
  contrastFromL,
  mustInput,
} from "./adaptiveGlassTestSupport"
import {
  DEFAULT_GLASS_TUNING,
  GLASS_PROFILE_BASE,
  createGlassTuning,
  resolveGlass,
} from "./glass"

describe("Glass profile/tuning characterization (WS1 baseline)", () => {
  test("Adaptive resolution atomically falls back from hostile tuning getters", () => {
    // Given — valid transmission/blur siblings would change the resolved material
    const analysis = mustInput({ luminance: 0.55, chroma: 0.2, detail: 0 })
    const expected = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
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
    const actual = solveAdaptiveGlass({
      profile: "balanced",
      tuning: forgedTuning,
      analysis,
    })

    // Then — the whole invalid tuning object falls back after one stable snapshot
    expect([
      transmissionReads,
      blurReads,
      saturationReads,
      highlightReads,
    ]).toEqual([1, 1, 1, 1])
    expect(actual).toEqual(expected)
  })

  test("resolveGlass maps each profile to base band with zero tuning", () => {
    // Given
    const tuningR = createGlassTuning({})
    if (!tuningR.ok) throw new Error("tuning")
    const tuning = tuningR.value
    // When / Then
    for (const profile of ["clear", "balanced", "deep"] as const) {
      const glass = resolveGlass(profile, tuning)
      expect(glass.profile).toBe(profile)
      expect(glass.enabled).toBe(true)
      expect(glass.blurPx).toBe(GLASS_PROFILE_BASE[profile].blurPx)
      expect(glass.opacity).toBe(GLASS_PROFILE_BASE[profile].opacity)
      expect(glass.highlight).toBe(GLASS_PROFILE_BASE[profile].highlight)
      expect(glass.saturation).toBe(GLASS_PROFILE_BASE[profile].saturation)
      expect(glass.tuning).toEqual(DEFAULT_GLASS_TUNING)
    }
  })

  test("positive transmission and blur tuning stay inside the balanced band", () => {
    // Given
    const tuningR = createGlassTuning({ transmission: 0.1, blur: 6 })
    if (!tuningR.ok) throw new Error("tuning")
    // When
    const glass = resolveGlass("balanced", tuningR.value)
    // Then
    expect(glass.blurPx).toBe(28)
    expect(glass.opacity).toBe(0.16)
  })
})

describe("AdaptiveGlassInput boundary", () => {
  test("changing getters are snapshotted exactly once before validation", () => {
    // Given — each getter is valid once, then becomes hostile on a second read
    let luminanceReads = 0
    let chromaReads = 0
    let detailReads = 0
    const analysis = {
      get luminance() {
        luminanceReads += 1
        return luminanceReads === 1 ? 0.55 : Number.NaN
      },
      get chroma() {
        chromaReads += 1
        return chromaReads === 1 ? 0.2 : Number.POSITIVE_INFINITY
      },
      get detail() {
        detailReads += 1
        return detailReads === 1 ? 0.4 : Number.NaN
      },
    }

    // When
    const glass = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })

    // Then — validation and copying use one stable snapshot
    expect([luminanceReads, chromaReads, detailReads]).toEqual([1, 1, 1])
    expect(glass.adaptive.analysis).toEqual({
      luminance: 0.55,
      chroma: 0.2,
      detail: 0.4,
    })
    expect(glass.adaptive.usedFallback).toBe(false)
    assertFiniteMaterial(glass)
  })

  test("accepts normalized luminance/chroma/detail in [0,1]", () => {
    // Given / When
    const r = parseAdaptiveGlassInput({
      luminance: 0,
      chroma: 0.5,
      detail: 1,
    })
    // Then
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.luminance).toBe(0)
      expect(r.value.chroma).toBe(0.5)
      expect(r.value.detail).toBe(1)
    }
  })

  test("rejects out-of-range and non-finite channels with typed errors", () => {
    // Given / When
    const high = parseAdaptiveGlassInput({
      luminance: 1.01,
      chroma: 0.2,
      detail: 0.2,
    })
    const low = parseAdaptiveGlassInput({
      luminance: 0.2,
      chroma: -0.01,
      detail: 0.2,
    })
    const nan = parseAdaptiveGlassInput({
      luminance: Number.NaN,
      chroma: 0.2,
      detail: 0.2,
    })
    // Then
    expect(high.ok).toBe(false)
    if (!high.ok) expect(high.error.code).toBe("invalid_luminance")
    expect(low.ok).toBe(false)
    if (!low.ok) expect(low.error.code).toBe("invalid_chroma")
    expect(nan.ok).toBe(false)
    if (!nan.ok) expect(nan.error.code).toBe("invalid_luminance")
  })
})

describe("Surface-split Adaptive Glass (lens vs content-direct)", () => {
  test("clear tuning and Adaptive blur compose before the final hard clamp", () => {
    // Given — clear base 16 + tuning -12 + Adaptive detail boost 10
    const tuning = createGlassTuning({ blur: -12 })
    if (!tuning.ok) throw new Error("tuning")
    const analysis = mustInput({ luminance: 0.5, chroma: 0.1, detail: 1 })

    // When
    const glass = solveAdaptiveGlass({
      profile: "clear",
      tuning: tuning.value,
      analysis,
    })

    // Then — clamp(16 - 12 + 10) is the literal clear floor
    expect(glass.blurPx).toBe(14)
  })

  test("bright wallpaper: contentDirect dark text; lens light glass + dark text, stays translucent", () => {
    // Given — bright flat field L=0.88
    const analysis = mustInput({ luminance: 0.88, chroma: 0.08, detail: 0.1 })
    // When
    const glass = solveAdaptiveGlass({
      profile: "balanced",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    // Then — content-direct: dark ink on bright ground (DESIGN Content-direct)
    expect(glass.adaptive.contentDirect.polarity).toBe("dark-on-light")
    expect(glass.adaptive.contentDirect.foregroundL).toBeLessThan(0.35)
    expect(glass.adaptive.contentDirect.effectiveBackgroundL).toBeGreaterThan(
      0.5,
    )
    assertTextFloors(glass.adaptive.contentDirect)

    // Then — lens: glass follows the wallpaper (light glass, dark ink)
    expect(glass.adaptive.lens.polarity).toBe("dark-on-light")
    expect(glass.adaptive.lens.foregroundL).toBeLessThan(0.35)
    expect(glass.adaptive.lens.tintOpacity).toBeGreaterThanOrEqual(0.12)
    // Translucency contract: the safety scrim must stay thin on a bright field
    // so blur + tint read as real glass, not an opaque panel.
    expect(glass.adaptive.lens.scrimOpacity).toBeLessThan(0.35)
    expect(glass.adaptive.lens.effectiveBackgroundL).toBeGreaterThan(0.5)
    assertTextFloors(glass.adaptive.lens)

    // CSS tokens present for WidgetSurface variants
    expect(glass.adaptive.lens.foreground.startsWith("oklch(")).toBe(true)
    expect(glass.adaptive.lens.tint.includes("/")).toBe(true)
    expect(glass.adaptive.contentDirect.foreground.startsWith("oklch(")).toBe(
      true,
    )

    // Top-level aliases mirror lens for StyleTokens.glass backward coherence
    expect(glass.adaptive.foreground).toBe(glass.adaptive.lens.foreground)
    expect(glass.adaptive.tint).toBe(glass.adaptive.lens.tint)
  })

  test("dark wallpaper: contentDirect light text; lens dark glass + light text, stays translucent", () => {
    // Given
    const analysis = mustInput({ luminance: 0.14, chroma: 0.05, detail: 0.12 })
    // When
    const glass = solveAdaptiveGlass({
      profile: "clear",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    // Then
    expect(glass.adaptive.contentDirect.polarity).toBe("light-on-dark")
    expect(glass.adaptive.contentDirect.foregroundL).toBeGreaterThan(0.65)
    assertTextFloors(glass.adaptive.contentDirect)

    expect(glass.adaptive.lens.polarity).toBe("light-on-dark")
    expect(glass.adaptive.lens.foregroundL).toBeGreaterThan(0.65)
    // Translucency contract on dark fields too
    expect(glass.adaptive.lens.scrimOpacity).toBeLessThan(0.35)
    assertTextFloors(glass.adaptive.lens)
  })

  test("muted foreground meets 4.5:1 on both branches (not decorative-only)", () => {
    // Given — mid bright detailed field historically under-floor for muted
    const analysis = mustInput({ luminance: 0.72, chroma: 0.15, detail: 0.6 })
    // When
    const glass = solveAdaptiveGlass({
      profile: "clear",
      tuning: DEFAULT_GLASS_TUNING,
      analysis,
    })
    // Then — independent L contrast for muted text tokens
    for (const branch of [
      glass.adaptive.lens,
      glass.adaptive.contentDirect,
    ] as const) {
      const mutedRatio = contrastFromL(
        branch.mutedL,
        branch.effectiveBackgroundL,
      )
      expect(mutedRatio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(branch.mutedContrastRatio).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      )
      // Hierarchy: muted is not identical to primary (chroma/weight hierarchy)
      expect(branch.mutedForeground).not.toBe(branch.foreground)
    }
  })
})
