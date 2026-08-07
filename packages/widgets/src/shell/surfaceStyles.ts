import type { StyleTokens } from "@yindex/domain"
import type { CSSProperties } from "react"

export type LensShape = "panel" | "capsule" | "shelf"

export type LivingGlassCssProperties = CSSProperties & {
  readonly "--yindex-lens-ink"?: string
  readonly "--yindex-lens-muted-ink"?: string
  readonly "--yindex-content-direct-ink"?: string
  readonly "--yindex-content-direct-muted-ink"?: string
  readonly "--yindex-content-direct-tint"?: string
  readonly "--yindex-content-direct-tint-opacity"?: number
  readonly "--yindex-glass-tint"?: string
  readonly "--yindex-glass-tint-opacity"?: number
  readonly "--yindex-glass-scrim"?: string
  readonly "--yindex-glass-scrim-opacity"?: number
  readonly "--yindex-content-direct-scrim"?: string
  readonly "--yindex-content-direct-scrim-opacity"?: number
  readonly "--yindex-glass-blur"?: string
  readonly "--yindex-glass-opacity"?: number
  readonly "--yindex-glass-saturation"?: number
  readonly "--yindex-glass-highlight"?: number
  readonly "--yindex-widget-foreground"?: string
  readonly "--yindex-widget-muted-foreground"?: string
}

const LENS_BRIGHTNESS = 1.06
const FLOAT_SHADOW = "0 16px 36px color-mix(in oklch, black 22%, transparent)"
const TILE_FLOAT_SHADOW =
  "0 8px 20px color-mix(in oklch, black 20%, transparent)"

function lensRadius(tokens: StyleTokens, shape: LensShape): string {
  return shape === "capsule" ? "999px" : tokens.radius.md
}

function baseChrome(tokens: StyleTokens): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    fontFamily: tokens.typography.bodyFamily,
    fontSize: tokens.typography.bodySizePx,
  }
}

export function buildLensSurfaceStyle(
  tokens: StyleTokens,
  shape: LensShape,
): LivingGlassCssProperties {
  const { lens } = tokens.glass.adaptive
  const highlightPct = Math.round(
    Math.min(0.45, Math.max(0.25, tokens.glass.highlight)) * 100,
  )
  const edgePct = Math.round(8 + tokens.glass.highlight * 10)
  const glassOn = tokens.glass.enabled
  const backdrop = glassOn
    ? `blur(${tokens.glass.blurPx}px) saturate(var(--yindex-glass-saturation, 1)) brightness(${LENS_BRIGHTNESS})`
    : undefined

  return {
    ...baseChrome(tokens),
    color: lens.foreground,
    background: glassOn ? lens.tint : tokens.color.surface,
    backgroundImage: glassOn
      ? `linear-gradient(${lens.scrim}, ${lens.scrim})`
      : undefined,
    borderRadius: lensRadius(tokens, shape),
    border: glassOn
      ? `1px solid color-mix(in oklch, white ${edgePct}%, transparent)`
      : `1px solid color-mix(in oklch, ${tokens.color.ink} 10%, transparent)`,
    backdropFilter: backdrop,
    WebkitBackdropFilter: backdrop,
    boxShadow: glassOn
      ? `inset 0 1px 0 color-mix(in oklch, white ${highlightPct}%, transparent), inset 0 0 0 1px color-mix(in oklch, white ${edgePct}%, transparent), ${FLOAT_SHADOW}`
      : tokens.elevation.mode === "tonal"
        ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 6%, transparent), 0 10px 28px color-mix(in oklch, black 10%, transparent)`
        : tokens.elevation.mode === "flat"
          ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 5%, transparent)`
          : "none",
    "--yindex-lens-ink": lens.foreground,
    "--yindex-lens-muted-ink": lens.mutedForeground,
    "--yindex-widget-foreground": lens.foreground,
    "--yindex-widget-muted-foreground": lens.mutedForeground,
    "--yindex-glass-tint": lens.tint,
    "--yindex-glass-tint-opacity": lens.tintOpacity,
    "--yindex-glass-scrim": lens.scrim,
    "--yindex-glass-scrim-opacity": lens.scrimOpacity,
    "--yindex-glass-blur": `${tokens.glass.blurPx}px`,
    "--yindex-glass-opacity": tokens.glass.opacity,
    "--yindex-glass-saturation": tokens.glass.saturation,
    "--yindex-glass-highlight": tokens.glass.highlight,
  }
}

export function buildContentDirectSurfaceStyle(
  tokens: StyleTokens,
): LivingGlassCssProperties {
  const { contentDirect } = tokens.glass.adaptive
  return {
    ...baseChrome(tokens),
    color: contentDirect.foreground,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    textShadow:
      contentDirect.scrimOpacity > 0
        ? `0 1px 24px ${contentDirect.scrim}`
        : "none",
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    "--yindex-content-direct-ink": contentDirect.foreground,
    "--yindex-content-direct-muted-ink": contentDirect.mutedForeground,
    "--yindex-content-direct-tint": contentDirect.tint,
    "--yindex-content-direct-tint-opacity": contentDirect.tintOpacity,
    "--yindex-content-direct-scrim": contentDirect.scrim,
    "--yindex-content-direct-scrim-opacity": contentDirect.scrimOpacity,
    "--yindex-widget-foreground": contentDirect.foreground,
    "--yindex-widget-muted-foreground": contentDirect.mutedForeground,
  }
}

/**
 * A single Liquid Glass tile (e.g. a Shortcut squircle) floating directly on
 * the Wallpaper: same physics as LensSurface, smaller float shadow, squircle
 * radius instead of a shell radius. Tiles never paint the readability scrim —
 * they carry icons/glyphs, not body text — so blur + tint + highlight stay
 * fully visible and the tile reads as real translucent glass.
 */
export function buildGlassTileStyle(
  tokens: StyleTokens,
  radiusPx = 20,
): LivingGlassCssProperties {
  const { lens } = tokens.glass.adaptive
  const highlightPct = Math.round(
    Math.min(0.55, Math.max(0.3, tokens.glass.highlight + 0.08)) * 100,
  )
  const edgePct = Math.round(10 + tokens.glass.highlight * 12)
  const glassOn = tokens.glass.enabled
  const backdrop = glassOn
    ? `blur(${tokens.glass.blurPx}px) saturate(var(--yindex-glass-saturation, 1)) brightness(${LENS_BRIGHTNESS})`
    : undefined
  return {
    color: lens.foreground,
    background: glassOn ? lens.tint : tokens.color.surface,
    backgroundImage: glassOn
      ? "linear-gradient(color-mix(in oklch, white 10%, transparent), transparent 55%)"
      : undefined,
    borderRadius: radiusPx,
    border: glassOn
      ? `1px solid color-mix(in oklch, white ${edgePct}%, transparent)`
      : `1px solid color-mix(in oklch, ${tokens.color.ink} 10%, transparent)`,
    backdropFilter: backdrop,
    WebkitBackdropFilter: backdrop,
    boxShadow: glassOn
      ? `inset 0 1px 0 color-mix(in oklch, white ${highlightPct}%, transparent), inset 0 0 0 1px color-mix(in oklch, white ${edgePct}%, transparent), ${TILE_FLOAT_SHADOW}`
      : tokens.elevation.mode === "tonal"
        ? "0 4px 14px color-mix(in oklch, black 10%, transparent)"
        : "none",
  }
}

/**
 * Bare grid surface: a fully transparent container straight on the Wallpaper
 * (no shelf/bar shell). Exposes lens glass variables for child tiles and
 * content-direct foreground variables for readable labels.
 */
export function buildBareSurfaceStyle(
  tokens: StyleTokens,
): LivingGlassCssProperties {
  const { lens, contentDirect } = tokens.glass.adaptive
  return {
    ...baseChrome(tokens),
    color: contentDirect.foreground,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    textShadow:
      contentDirect.scrimOpacity > 0
        ? `0 1px 16px ${contentDirect.scrim}`
        : "none",
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    "--yindex-lens-ink": lens.foreground,
    "--yindex-lens-muted-ink": lens.mutedForeground,
    "--yindex-content-direct-ink": contentDirect.foreground,
    "--yindex-content-direct-muted-ink": contentDirect.mutedForeground,
    "--yindex-widget-foreground": contentDirect.foreground,
    "--yindex-widget-muted-foreground": contentDirect.mutedForeground,
    "--yindex-glass-tint": lens.tint,
    "--yindex-glass-tint-opacity": lens.tintOpacity,
    "--yindex-glass-scrim": lens.scrim,
    "--yindex-glass-scrim-opacity": lens.scrimOpacity,
    "--yindex-glass-blur": `${tokens.glass.blurPx}px`,
    "--yindex-glass-opacity": tokens.glass.opacity,
    "--yindex-glass-saturation": tokens.glass.saturation,
    "--yindex-glass-highlight": tokens.glass.highlight,
  }
}
