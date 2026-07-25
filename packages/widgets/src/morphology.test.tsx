import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type StyleTokens,
  createGenerativePageStyle,
  pageStyleToTokens,
} from "@yindex/domain"
import { BUILTIN_CATALOG } from "./catalog"
import {
  buildContentDirectSurfaceStyle,
  buildLensSurfaceStyle,
} from "./shell/surface"

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
    expect(source).toContain("0 1px 24px")
    expect(source).toContain("contentDirect")
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
    expect(source).toContain("0 1px 24px")
  })

  test("Given Search source, When inspected, Then it uses capsule lens without opaque color.surface override", () => {
    // Given / When
    const source = widgetSource("search/SearchWidget.tsx")

    // Then
    expect(source).toContain('shape="capsule"')
    expect(source).toContain("LensSurface")
    expect(source).not.toContain("WidgetSurface")
    expect(source).not.toContain("color.surface")
    expect(source).not.toContain("background: props.tokens.color.surface")
  })

  test("Given Weather Shortcuts Hexagram sources, When inspected, Then capsule shelf panel lenses are fixed", () => {
    // Given / When
    const weather = widgetSource("weather/WeatherWidget.tsx")
    const shortcuts = widgetSource("shortcuts/ShortcutsWidget.tsx")
    const hexagram = widgetSource("hexagram/HexagramBoard.tsx")

    // Then
    expect(weather).toContain('shape="capsule"')
    expect(weather).toContain("LensSurface")
    expect(shortcuts).toContain('shape="shelf"')
    expect(shortcuts).toContain("LensSurface")
    expect(shortcuts).not.toContain("background: props.tokens.color.bg")
    expect(hexagram).toContain('shape="panel"')
    expect(hexagram).toContain("LensSurface")
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
