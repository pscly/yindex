import type { StyleTokens } from "@yindex/domain"
import type { CSSProperties } from "react"

export type PageTokenCssProperties = CSSProperties & {
  readonly "--yindex-ink": string
  readonly "--yindex-muted-ink": string
  readonly "--yindex-lens-ink": string
  readonly "--yindex-lens-muted-ink": string
  readonly "--yindex-content-direct-ink": string
  readonly "--yindex-content-direct-muted-ink": string
  readonly "--yindex-glass-tint": string
  readonly "--yindex-glass-tint-opacity": number
  readonly "--yindex-glass-scrim": string
  readonly "--yindex-glass-scrim-opacity": number
  readonly "--yindex-content-direct-scrim": string
  readonly "--yindex-content-direct-scrim-opacity": number
  readonly "--yindex-glass-blur": string
  readonly "--yindex-glass-opacity": number
  readonly "--yindex-glass-saturation": number
  readonly "--yindex-glass-highlight": number
}

export function pageTokenCssVars(tokens: StyleTokens): PageTokenCssProperties {
  const { lens, contentDirect } = tokens.glass.adaptive
  return {
    "--yindex-ink": lens.foreground,
    "--yindex-muted-ink": lens.mutedForeground,
    "--yindex-lens-ink": lens.foreground,
    "--yindex-lens-muted-ink": lens.mutedForeground,
    "--yindex-content-direct-ink": contentDirect.foreground,
    "--yindex-content-direct-muted-ink": contentDirect.mutedForeground,
    "--yindex-glass-tint": lens.tint,
    "--yindex-glass-tint-opacity": lens.tintOpacity,
    "--yindex-glass-scrim": lens.scrim,
    "--yindex-glass-scrim-opacity": lens.scrimOpacity,
    "--yindex-content-direct-scrim": contentDirect.scrim,
    "--yindex-content-direct-scrim-opacity": contentDirect.scrimOpacity,
    "--yindex-glass-blur": `${tokens.glass.blurPx}px`,
    "--yindex-glass-opacity": tokens.glass.opacity,
    "--yindex-glass-saturation": tokens.glass.saturation,
    "--yindex-glass-highlight": tokens.glass.highlight,
  }
}
