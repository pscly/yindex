import { describe, expect, test } from "bun:test"
import { defaultPageStyle, resolvePageTokens } from "@yindex/domain"
import * as publicCatalog from "./index"
import {
  EDITOR_GRAPHITE,
  FLOW,
  MOMENT,
  MUSE,
  STYLE_PACKS,
  applyStylePack,
  getStylePack,
} from "./index"

describe("style packs (scene presets)", () => {
  test("the public catalog exposes exactly three Page Style Packs", () => {
    // When
    const ids = STYLE_PACKS.map((pack) => String(pack.id))

    // Then
    expect(STYLE_PACKS).toHaveLength(3)
    expect(ids).toEqual(["moment", "muse", "flow"])
    expect(EDITOR_GRAPHITE).toEqual({
      color: {
        bg: "oklch(0.16 0.008 260)",
        surface: "oklch(0.22 0.01 260)",
        ink: "oklch(0.94 0.01 260)",
        muted: "oklch(0.72 0.02 260)",
        line: "oklch(0.35 0.015 260)",
        accent: "oklch(0.62 0.14 36)",
      },
    })
    expect(STYLE_PACKS.some((pack) => Object.is(pack, EDITOR_GRAPHITE))).toBe(
      false,
    )
  })

  test("legacy ids are not public Style Packs", () => {
    // Given
    const legacyIds = ["caliper", "inkstone", "dew-glass"]

    // When
    const resolved = legacyIds.map(getStylePack)

    // Then
    expect(resolved).toEqual([undefined, undefined, undefined])
    expect(Object.keys(publicCatalog)).not.toContain("CALIPER")
    expect(Object.keys(publicCatalog)).not.toContain("INKSTONE")
    expect(Object.keys(publicCatalog)).not.toContain("DEW_GLASS")
    expect(Object.keys(publicCatalog)).not.toContain("STYLE_PACK_BY_ID")
  })

  test("applying each public Style Pack sets its complete visual mood", () => {
    // Given — every palette differs from the neutral Domain fallback
    const expected = [
      {
        pack: MOMENT,
        preset: "moment",
        seedPalette: {
          bg: "oklch(0.72 0.04 240)",
          surface: "oklch(0.92 0.02 240 / 0.45)",
          ink: "oklch(0.22 0.03 250)",
          muted: "oklch(0.42 0.02 250)",
          accent: "oklch(0.62 0.10 240)",
        },
        typographyMood: "sans",
      },
      {
        pack: MUSE,
        preset: "muse",
        seedPalette: {
          bg: "oklch(0.18 0.02 40)",
          surface: "oklch(0.28 0.03 40 / 0.5)",
          ink: "oklch(0.93 0.02 70)",
          muted: "oklch(0.72 0.03 60)",
          accent: "oklch(0.55 0.18 28)",
        },
        typographyMood: "serif",
      },
      {
        pack: FLOW,
        preset: "flow",
        seedPalette: {
          bg: "oklch(0.12 0.03 260)",
          surface: "oklch(0.24 0.04 250 / 0.45)",
          ink: "oklch(0.96 0.01 240)",
          muted: "oklch(0.78 0.03 230)",
          accent: "oklch(0.78 0.08 200)",
        },
        typographyMood: "sans",
      },
    ] as const

    // When
    const applied = expected.map((contract) => ({
      contract,
      style: applyStylePack(contract.pack),
    }))

    // Then
    for (const { contract, style } of applied) {
      expect(style.wallpaper.kind).toBe("generative")
      if (style.wallpaper.kind === "generative") {
        expect(style.wallpaper.generativePreset).toBe(contract.preset)
      }
      expect(style.seedPalette).toEqual(contract.seedPalette)
      expect(style.seedPalette).not.toEqual(defaultPageStyle().seedPalette)
      expect(style.typographyMood).toBe(contract.typographyMood)
      const displayFamily = resolvePageTokens(style).typography.displayFamily
      expect(displayFamily).toContain(
        contract.typographyMood === "serif" ? "Noto Serif SC" : "Noto Sans SC",
      )
    }
  })
})
