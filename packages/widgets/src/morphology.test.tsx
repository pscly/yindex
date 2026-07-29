import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type StyleTokens,
  assertNever,
  createGenerativePageStyle,
  pageStyleToTokens,
} from "@yindex/domain"
import { BUILTIN_CATALOG, SURFACE_VARIANT_BY_TYPE } from "./catalog"
import {
  ContentDirectSurface,
  LensSurface,
  WidgetSurface,
  buildContentDirectSurfaceStyle,
  buildLensSurfaceStyle,
} from "./shell/surface"
import type { WidgetSurfaceVariant } from "./shell/surface"
import * as weatherModule from "./weather/WeatherWidget"

function tokensFor(
  mood: "sans" | "serif" = "sans",
  preset: "moment" | "muse" | "flow" = "flow",
): StyleTokens {
  const style = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.2 0.02 250)",
      surface: "opaque-gray-must-not-be-used",
      ink: "oklch(0.96 0.01 250)",
      muted: "oklch(0.76 0.02 250)",
      accent: "oklch(0.68 0.1 220)",
    },
    generativePreset: preset,
    glassProfile: "balanced",
    typographyMood: mood,
  })
  if (!style.ok) throw new Error(style.error.message)
  return pageStyleToTokens(style.value, {
    luminance: 0.2,
    chroma: 0.06,
    detail: 0.1,
  })
}

function widgetSource(relativePath: string): string {
  return readFileSync(join(import.meta.dir, relativePath), "utf8")
}

function renderSurfaceVariant(
  tokens: StyleTokens,
  variant: WidgetSurfaceVariant,
) {
  switch (variant.kind) {
    case "lens":
      return LensSurface({ tokens, shape: variant.shape, children: "天气" })
    case "content-direct":
      return ContentDirectSurface({ tokens, children: "天气" })
    default:
      return assertNever(variant)
  }
}

describe("Builtin Widget fixed morphology", () => {
  test("Given catalog morphology, When paired with Living Glass builders, Then surface modes match DESIGN mapping", () => {
    // Given
    const tokens = tokensFor()
    const byId = Object.fromEntries(
      BUILTIN_CATALOG.map((entry) => [String(entry.typeId), entry]),
    )

    // When / Then
    expect(byId["builtin.clock"]?.surfaceMode).toBe("content-direct")
    expect(byId["builtin.quote"]?.surfaceMode).toBe("content-direct")
    expect(buildContentDirectSurfaceStyle(tokens).background).toBe(
      "transparent",
    )
    expect(buildContentDirectSurfaceStyle(tokens).border).toBe("none")

    expect(byId["builtin.search"]?.lensShape).toBe("capsule")
    expect(buildLensSurfaceStyle(tokens, "capsule").borderRadius).toBe("999px")
    expect(byId["builtin.weather"]?.surfaceMode).toBe("lens")
    expect(byId["builtin.weather"]?.lensShape).toBe("capsule")

    expect(byId["builtin.shortcuts"]?.lensShape).toBe("shelf")
    expect(buildLensSurfaceStyle(tokens, "shelf").borderRadius).toBe(
      tokens.radius.md,
    )
    expect(byId["builtin.hexagram"]?.lensShape).toBe("panel")
    expect(buildLensSurfaceStyle(tokens, "panel").borderRadius).toBe(
      tokens.radius.md,
    )
  })

  test("Given Clock source, When inspected, Then it is content-direct with DESIGN display scale and weight band", () => {
    // Given / When
    const source = widgetSource("clock/ClockWidget.tsx")

    // Then
    expect(source).toContain("ContentDirectSurface")
    expect(source).not.toContain("WidgetSurface")
    expect(source).toContain("clamp(4.5rem, 14vw, 9rem)")
    expect(source).toContain("Math.min(\n    200,")
    expect(source).toContain("Math.max(100,")
    expect(source).not.toContain("glass.adaptive")
  })

  test("Given Quote source, When inspected, Then it is content-direct with serif display scale and soft scrim", () => {
    // Given / When
    const source = widgetSource("quote/QuoteWidget.tsx")

    // Then
    expect(source).toContain("ContentDirectSurface")
    expect(source).not.toContain("WidgetSurface")
    expect(source).toContain("clamp(1.4rem, 3vw, 2.2rem)")
    expect(source).toContain("lineHeight: 1.8")
    expect(source).toContain("fontWeight: 550")
    expect(source).not.toContain("glass.adaptive")
  })

  test("Given Search source, When inspected, Then it uses capsule lens without opaque color.surface override", () => {
    // Given / When
    const source = widgetSource("search/SearchWidget.tsx")

    // Then
    expect(source).toContain("LensSurface")
    expect(source).toContain('shape="capsule"')
    expect(source).not.toContain("WidgetSurface")
    expect(source).toContain('data-yindex-search-input="true"')
    expect(source).toContain("::placeholder")
    expect(source).not.toContain("color.surface")
    expect(source).not.toContain("background: props.tokens.color.surface")
  })

  test("Given Weather host metadata, When Weather renders, Then it is a capsule lens", () => {
    // Given
    const tokens = tokensFor()
    const weather = BUILTIN_CATALOG.find(
      (entry) => entry.typeId === "builtin.weather",
    )
    const weatherVariant = SURFACE_VARIANT_BY_TYPE["builtin.weather"]

    // When
    const weatherSurface = WidgetSurface({
      tokens,
      variant: weatherVariant,
      children: "天气",
    })
    const renderedSurface = renderSurfaceVariant(tokens, weatherVariant)

    // Then
    expect(weather).toMatchObject({
      surfaceMode: "lens",
      lensShape: "capsule",
    })
    expect(weatherSurface).toMatchObject({
      type: LensSurface,
      props: { shape: "capsule" },
    })
    expect(renderedSurface).toMatchObject({
      props: {
        dataAttrs: {
          "data-widget-surface": "lens",
          "data-lens-shape": "capsule",
        },
      },
    })
  })

  test("Given desktop and tablet Weather bounds, When compact content is budgeted, Then it stays inside the capsule", () => {
    // Given
    const weather = widgetSource("weather/WeatherWidget.tsx")
    const weatherStackHeightPx = 24.8 + 13 * 1.15 + 11 * 1.15 + 2 * 2
    const constraints = [
      { name: "desktop", widthPx: 1280, heightPx: 800 },
      { name: "tablet", widthPx: 1024, heightPx: 768 },
    ] as const

    // When / Then
    for (const constraint of constraints) {
      const capsuleWidthPx = constraint.widthPx * 0.22
      const capsuleHeightPx = constraint.heightPx * 0.12
      const contentWidthPx = capsuleWidthPx - 2 - 16 * 2
      const contentHeightPx = capsuleHeightPx - 2 - 16 * 2
      expect(
        contentWidthPx,
        `${constraint.name} Weather content width`,
      ).toBeGreaterThanOrEqual(160)
      expect(
        contentHeightPx,
        `${constraint.name} Weather content height`,
      ).toBeGreaterThanOrEqual(weatherStackHeightPx)
    }
    expect(weather).toContain('height: "100%"')
    expect(weather).toContain("minHeight: 0")
    expect(weather).toContain("minWidth: 0")
    expect(weather).toContain('overflow: "hidden"')
    expect(weather).toContain('textOverflow: "ellipsis"')
    expect(weather).toContain('whiteSpace: "nowrap"')
    expect(weather).toContain("paddingInline: 6")
  })

  test("Given geolocation failure with a local label, When Shanghai fallback is selected, Then the label is truthful", () => {
    // Given
    const locationLabel: unknown = Reflect.get(
      weatherModule,
      "weatherLocationLabel",
    )
    expect(typeof locationLabel).toBe("function")
    if (typeof locationLabel !== "function") return

    // When
    const fallbackLabel = Reflect.apply(locationLabel, undefined, [
      "本地",
      true,
    ])
    const locatedLabel = Reflect.apply(locationLabel, undefined, [
      "本地",
      false,
    ])

    // Then
    expect(fallbackLabel).toBe("上海（定位失败）")
    expect(locatedLabel).toBe("本地")
  })

  test("Given protected branch text colors, When Widget sources are inspected, Then no shell text is dimmed with opacity", () => {
    // Given / When
    const surface = widgetSource("shell/surface.tsx")
    const shortcuts = widgetSource("shortcuts/ShortcutsWidget.tsx")
    const hexagram = widgetSource("hexagram/HexagramBoard.tsx")

    // Then
    expect(surface).not.toContain("opacity: 0.85")
    expect(shortcuts).not.toContain("opacity: 0.88")
    expect(hexagram).not.toContain("opacity: locked")
  })

  test("Given Weather Shortcuts Hexagram sources, When inspected, Then their fixed product variants are assigned", () => {
    // Given / When
    const weather = widgetSource("weather/WeatherWidget.tsx")
    const shortcuts = widgetSource("shortcuts/ShortcutsWidget.tsx")
    const hexagram = widgetSource("hexagram/HexagramBoard.tsx")

    // Then
    expect(weather).toContain("LensSurface")
    expect(weather).toContain('shape="capsule"')
    expect(weather).not.toContain("WidgetSurface")
    expect(weather).not.toContain("glass.adaptive")
    // Secondary row must stay inset from capsule ends so overflow:hidden cannot mid-glyph clip.
    expect(weather).toContain("paddingInline: 6")
    expect(weather).toContain('textOverflow: "ellipsis"')
    expect(weather).toContain("clamp(1.25rem, 2.6vw, 1.55rem)")
    expect(shortcuts).toContain("LensSurface")
    expect(shortcuts).toContain('shape="shelf"')
    expect(shortcuts).not.toContain("WidgetSurface")
    expect(shortcuts).not.toContain("background: props.tokens.color.bg")
    expect(hexagram).toContain("LensSurface")
    expect(hexagram).toContain('shape="panel"')
    expect(hexagram).not.toContain("WidgetSurface")
    expect(hexagram).toContain("fontSize: 16.5")
  })

  test("Given Muse tokens, When display family resolves, Then Quote can consume serif display without local re-solve", () => {
    // Given
    const muse = tokensFor("serif", "muse")
    const flow = tokensFor("sans", "flow")

    // Then
    expect(muse.typography.displayFamily.toLowerCase()).toContain("serif sc")
    expect(flow.typography.displayFamily.toLowerCase()).toContain("sans sc")
    expect(flow.typography.displayFamily.toLowerCase()).not.toContain(
      "serif sc",
    )
    expect(muse.glass.adaptive.contentDirect.foreground.length).toBeGreaterThan(
      0,
    )
  })
})
