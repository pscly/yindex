import { describe, expect, test } from "bun:test"
import {
  type StyleTokens,
  createGenerativePageStyle,
  pageStyleToTokens,
} from "@yindex/domain"
import {
  buildContentDirectSurfaceStyle,
  buildLensSurfaceStyle,
} from "./surface"

function clearGlassTokens(): StyleTokens {
  const style = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.18 0.02 250)",
      surface: "opaque-gray-must-not-be-used",
      ink: "oklch(0.96 0.01 250)",
      muted: "oklch(0.76 0.02 250)",
      accent: "oklch(0.68 0.1 220)",
    },
    generativePreset: "flow",
    glassProfile: "clear",
  })
  if (!style.ok) throw new Error(style.error.message)
  return pageStyleToTokens(style.value, {
    luminance: 0.14,
    chroma: 0.07,
    detail: 0.05,
  })
}

describe("Living Glass surface styles", () => {
  test("Given a low-opacity profile, When a panel lens is built, Then it consumes Adaptive Glass without an opacity floor", () => {
    // Given
    const tokens = clearGlassTokens()
    expect(tokens.glass.opacity).toBeLessThan(0.35)

    // When
    const style = buildLensSurfaceStyle(tokens, "panel")

    // Then
    expect(style["--yindex-glass-tint"]).toBe(tokens.glass.adaptive.lens.tint)
    expect(style["--yindex-glass-tint-opacity"]).toBe(
      tokens.glass.adaptive.lens.tintOpacity,
    )
    expect(style["--yindex-glass-scrim"]).toBe(tokens.glass.adaptive.lens.scrim)
    expect(style["--yindex-lens-ink"]).toBe(
      tokens.glass.adaptive.lens.foreground,
    )
    expect(style["--yindex-lens-muted-ink"]).toBe(
      tokens.glass.adaptive.lens.mutedForeground,
    )
    expect(style["--yindex-glass-opacity"]).toBe(tokens.glass.opacity)
    expect(style["--yindex-glass-saturation"]).toBe(tokens.glass.saturation)
    expect(style.backdropFilter).toContain(
      "saturate(var(--yindex-glass-saturation, 1))",
    )
    expect(style.backdropFilter).toContain("brightness(1.06)")
    expect(style.backdropFilter).not.toContain("saturate(1.15)")
    expect(style.background).toBe(tokens.glass.adaptive.lens.tint)
    expect(style.background).not.toContain(tokens.color.surface)
    expect(style.borderRadius).toBe(tokens.radius.md)
  })

  test("Given lens shapes, When styles are built, Then capsule is 999 and panel/shelf use radius.md", () => {
    // Given
    const tokens = clearGlassTokens()

    // When
    const capsule = buildLensSurfaceStyle(tokens, "capsule")
    const panel = buildLensSurfaceStyle(tokens, "panel")
    const shelf = buildLensSurfaceStyle(tokens, "shelf")

    // Then
    expect(capsule.borderRadius).toBe("999px")
    expect(panel.borderRadius).toBe(tokens.radius.md)
    expect(shelf.borderRadius).toBe(tokens.radius.md)
  })

  test("Given content-direct material, When style is built, Then there is no fill or border box", () => {
    // Given
    const tokens = clearGlassTokens()

    // When
    const style = buildContentDirectSurfaceStyle(tokens)

    // Then
    expect(style.background).toBe("transparent")
    expect(style.border).toBe("none")
    expect(style.boxShadow).toBe("none")
    expect(style.backdropFilter).toBeUndefined()
    expect(style.color).toBe(tokens.glass.adaptive.contentDirect.foreground)
    expect(style["--yindex-content-direct-ink"]).toBe(
      tokens.glass.adaptive.contentDirect.foreground,
    )
    expect(style["--yindex-content-direct-scrim"]).toBe(
      tokens.glass.adaptive.contentDirect.scrim,
    )
  })

  test("Given a clear lens style stringified, When inspected, Then legacy card fill and saturate(1.15) are absent", () => {
    // Given
    const tokens = clearGlassTokens()

    // When
    const serialized = JSON.stringify(buildLensSurfaceStyle(tokens, "panel"))

    // Then
    expect(serialized).not.toContain("opaque-gray-must-not-be-used")
    expect(serialized).not.toContain("saturate(1.15)")
    expect(serialized).not.toContain("0.35")
  })
})
