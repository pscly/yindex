import { describe, expect, test } from "bun:test"
import {
  applyOverride,
  pageStyleToTokens,
  resolvePageTokens,
  resolveWidgetTokens,
  withGlassProfile,
  withSeedPalette,
} from "./cascade"
import { DEFAULT_GLASS_TUNING } from "./glass"
import { createGenerativePageStyle } from "./pageStyle"
import type { StyleTokens } from "./types"

function samplePageStyle() {
  const r = createGenerativePageStyle({
    seedPalette: {
      bg: "bg",
      surface: "surface",
      ink: "ink",
      muted: "muted",
      accent: "accent",
    },
    generativePreset: "moment",
    dim: 0.1,
    glassProfile: "balanced",
  })
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}

describe("Style cascade (v2 liquid glass)", () => {
  test("page style resolves balanced glass and generative wallpaper", () => {
    // Given
    const pageStyle = samplePageStyle()
    // When
    const tokens = pageStyleToTokens(pageStyle)
    // Then
    expect(tokens.glass.profile).toBe("balanced")
    expect(tokens.glass.enabled).toBe(true)
    expect(tokens.glass.adaptive.usedFallback).toBe(true)
    expect(tokens.glass.adaptive.lens.contrastRatio).toBeGreaterThanOrEqual(4.5)
    expect(
      tokens.glass.adaptive.contentDirect.contrastRatio,
    ).toBeGreaterThanOrEqual(4.5)
    expect(tokens.glass.adaptive.contrastRatio).toBeGreaterThanOrEqual(4.5)
    expect(tokens.wallpaper.source.kind).toBe("generative")
    if (tokens.wallpaper.source.kind === "generative") {
      expect(tokens.wallpaper.source.generativePreset).toBe("moment")
    }
    expect(tokens.color.accent).toBe("accent")
  })

  test("resolvePageTokens prefers page seed over pack base", () => {
    // Given
    const pageStyle = withSeedPalette(samplePageStyle(), {
      bg: "page-bg",
      surface: "s",
      ink: "i",
      muted: "m",
      accent: "page-accent",
    })
    const packBase: StyleTokens = {
      ...pageStyleToTokens(samplePageStyle()),
      color: {
        bg: "pack-bg",
        surface: "s",
        ink: "i",
        muted: "m",
        accent: "pack-accent",
      },
    }
    // When
    const tokens = resolvePageTokens(packBase, pageStyle)
    // Then
    expect(tokens.color.accent).toBe("page-accent")
    expect(tokens.color.bg).toBe("page-bg")
  })

  test("switching glass profile keeps wallpaper", () => {
    // Given
    const page = samplePageStyle()
    // When
    const next = withGlassProfile(page, "deep")
    // Then
    expect(next.glassProfile).toBe("deep")
    expect(next.wallpaper).toEqual(page.wallpaper)
    expect(next.glassTuning).toEqual(DEFAULT_GLASS_TUNING)
  })

  test("widget inherits page unless override", () => {
    // Given
    const pageTokens = applyOverride(pageStyleToTokens(samplePageStyle()), {
      color: { ink: "page-ink" },
    })
    // When / Then
    expect(resolveWidgetTokens(pageTokens, null).color.ink).toBe("page-ink")
    expect(
      resolveWidgetTokens(pageTokens, { color: { ink: "widget-ink" } }).color
        .ink,
    ).toBe("widget-ink")
  })
})
