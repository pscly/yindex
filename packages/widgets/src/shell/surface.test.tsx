import { describe, expect, test } from "bun:test"
import {
  type StyleTokens,
  createGenerativePageStyle,
  pageStyleToTokens,
} from "@yindex/domain"
import {
  ContentDirectSurface,
  LensSurface,
  WidgetSurface,
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

function fallbackGlassTokens(): StyleTokens {
  const style = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.88 0.02 250)",
      surface: "opaque-gray-must-not-be-used",
      ink: "oklch(0.12 0.01 250)",
      muted: "oklch(0.32 0.02 250)",
      accent: "oklch(0.68 0.1 220)",
    },
    generativePreset: "moment",
    glassProfile: "balanced",
  })
  if (!style.ok) throw new Error(style.error.message)
  return pageStyleToTokens(style.value, null)
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
    expect(style["--yindex-widget-foreground"]).toBe(
      tokens.glass.adaptive.lens.foreground,
    )
    expect(style["--yindex-widget-muted-foreground"]).toBe(
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
    expect(style.backgroundImage).toBe(
      `linear-gradient(${tokens.glass.adaptive.lens.scrim}, ${tokens.glass.adaptive.lens.scrim})`,
    )
    expect(style.backgroundImage).not.toContain(
      tokens.glass.adaptive.contentDirect.scrim,
    )
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

  test("Given content-direct material, When style is built, Then the root stays transparent and shell-free", () => {
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
    expect(style["--yindex-content-direct-muted-ink"]).toBe(
      tokens.glass.adaptive.contentDirect.mutedForeground,
    )
    expect(style["--yindex-widget-foreground"]).toBe(
      tokens.glass.adaptive.contentDirect.foreground,
    )
    expect(style["--yindex-widget-muted-foreground"]).toBe(
      tokens.glass.adaptive.contentDirect.mutedForeground,
    )
    expect(style["--yindex-content-direct-tint"]).toBe(
      tokens.glass.adaptive.contentDirect.tint,
    )
    expect(style["--yindex-content-direct-scrim"]).toBe(
      tokens.glass.adaptive.contentDirect.scrim,
    )
    expect(style.textShadow).toBe(
      `0 1px 24px ${tokens.glass.adaptive.contentDirect.scrim}`,
    )
    expect(style.textShadow).not.toContain(tokens.glass.adaptive.lens.scrim)
  })

  test("Given content-direct material, When ContentDirectSurface renders, Then readability stays text-only without a backdrop shell", () => {
    // Given
    const tokens = clearGlassTokens()

    // When
    const element = ContentDirectSurface({ tokens, children: "content" })

    // Then
    expect(element).toMatchObject({
      props: {
        surfaceStyle: {
          background: "transparent",
          border: "none",
          boxShadow: "none",
          textShadow: `0 1px 24px ${tokens.glass.adaptive.contentDirect.scrim}`,
        },
      },
    })
    expect(Object.hasOwn(element.props, "backdropStyle")).toBe(false)
  })

  test("Given content-direct material without a scrim, When style is built, Then no soft scrim is applied", () => {
    // Given
    const tokens = clearGlassTokens()
    const tokensWithoutScrim: StyleTokens = {
      ...tokens,
      glass: {
        ...tokens.glass,
        adaptive: {
          ...tokens.glass.adaptive,
          contentDirect: {
            ...tokens.glass.adaptive.contentDirect,
            scrimOpacity: 0,
          },
        },
      },
    }

    // When
    const style = buildContentDirectSurfaceStyle(tokensWithoutScrim)

    // Then
    expect(style.textShadow).toBe("none")
  })

  test("Given an explicit content-direct variant, When WidgetSurface renders, Then it selects ContentDirectSurface", () => {
    // Given
    const tokens = clearGlassTokens()

    // When
    const element = WidgetSurface({
      tokens,
      variant: { kind: "content-direct" },
      children: "content",
    })

    // Then
    expect(element).toMatchObject({ type: ContentDirectSurface })
  })

  test("Given an explicit shelf-lens variant, When WidgetSurface renders, Then it preserves the lens shape", () => {
    // Given
    const tokens = clearGlassTokens()

    // When
    const element = WidgetSurface({
      tokens,
      variant: { kind: "lens", shape: "shelf" },
      children: "tools",
    })

    // Then
    expect(element).toMatchObject({
      type: LensSurface,
      props: { shape: "shelf" },
    })
  })

  test("Given balanced-safe fallback tokens, When both variants build, Then each branch renders finite safe CSS", () => {
    // Given
    const tokens = fallbackGlassTokens()
    expect(tokens.glass.adaptive.usedFallback).toBe(true)

    // When
    const lens = buildLensSurfaceStyle(tokens, "panel")
    const contentDirect = buildContentDirectSurfaceStyle(tokens)

    // Then
    expect(lens.color).toBe(tokens.glass.adaptive.lens.foreground)
    expect(contentDirect.color).toBe(
      tokens.glass.adaptive.contentDirect.foreground,
    )
    expect(JSON.stringify({ lens, contentDirect })).not.toMatch(/NaN|Infinity/)
    expect(tokens.glass.adaptive.lens.contrastRatio).toBeGreaterThanOrEqual(4.5)
    expect(
      tokens.glass.adaptive.contentDirect.mutedContrastRatio,
    ).toBeGreaterThanOrEqual(4.5)
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
