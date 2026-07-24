import { describe, expect, test } from "bun:test"
import { homeV2Schema } from "../migration/homeV2Schema"
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

function rawHomeWithStyleOverride(styleOverride: unknown) {
  return {
    schemaVersion: 2,
    sequence: { pageIds: ["page-1"], landingPageId: "page-1" },
    pages: {
      "page-1": {
        id: "page-1",
        name: "Page",
        icon: "◇",
        style: {
          seedPalette: {
            bg: "bg",
            surface: "surface",
            ink: "ink",
            muted: "muted",
            accent: "accent",
          },
          wallpaper: {
            kind: "generative",
            generativePreset: "moment",
            dim: 0.15,
          },
          glassProfile: "balanced",
          glassTuning: DEFAULT_GLASS_TUNING,
        },
        widgets: [
          {
            id: "widget-1",
            source: { kind: "builtin", typeId: "clock" },
            layout: { x: 10, y: 10, w: 20, h: 20, z: 0 },
            config: {},
            styleOverride,
          },
        ],
      },
    },
    settings: {
      rememberLastPage: false,
      allowHexagramRedraw: false,
      snapEnabled: true,
      showWidgetTitles: false,
      reducedMotion: "system",
      locale: "zh-CN",
      motionProfile: "balanced",
    },
    lastPageId: null,
  }
}

describe("Style cascade (v2 liquid glass)", () => {
  test("page token wrapper atomically falls back from hostile tuning getters", () => {
    // Given — valid transmission/blur siblings distinguish fallback from partial use
    const pageStyle = samplePageStyle()
    const analysis = { luminance: 0.55, chroma: 0.2, detail: 0 }
    const expected = pageStyleToTokens(pageStyle, analysis)
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
    const actual = pageStyleToTokens(
      { ...pageStyle, glassTuning: forgedTuning },
      analysis,
    )

    // Then — the wrapper preserves the resolver's atomic exact-once boundary
    expect([
      transmissionReads,
      blurReads,
      saturationReads,
      highlightReads,
    ]).toEqual([1, 1, 1, 1])
    expect(actual.glass).toEqual(expected.glass)
  })

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

  test("stored widget style override rejects a raw glass token bag", () => {
    // Given — the control is valid before adding exactly one forbidden key
    const validOverride = { color: { ink: "widget-ink" } }
    const control = homeV2Schema.safeParse(
      rawHomeWithStyleOverride(validOverride),
    )
    const rawHome = rawHomeWithStyleOverride({
      ...validOverride,
      glass: { blurPx: 999 },
    })

    // When
    const parsed = homeV2Schema.safeParse(rawHome)

    // Then — strictness rejects `glass` at the persisted override boundary
    expect(control.success).toBe(true)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find(
        (candidate) => candidate.code === "unrecognized_keys",
      )
      expect(issue?.code).toBe("unrecognized_keys")
      expect(issue?.path).toEqual([
        "pages",
        "page-1",
        "widgets",
        0,
        "styleOverride",
      ])
      if (issue?.code === "unrecognized_keys") {
        expect(issue.keys).toEqual(["glass"])
      }
    }
  })
})
