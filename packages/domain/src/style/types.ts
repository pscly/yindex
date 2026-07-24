import type { AdaptiveResolvedGlass } from "./adaptiveGlass"
import type { GlassProfile, GlassTuning } from "./glass"
import type { Wallpaper } from "./wallpaper"

export type ElevationMode = "flat" | "tonal" | "glass"

export type SeedPalette = {
  readonly bg: string
  readonly surface: string
  readonly ink: string
  readonly muted: string
  readonly accent: string
  readonly [key: string]: string
}

/**
 * Unified Liquid Glass Page Style (v2).
 * One material language; pages differ by palette / wallpaper / glass profile.
 */
export type PageStyle = {
  readonly seedPalette: SeedPalette
  readonly wallpaper: Wallpaper
  readonly glassProfile: GlassProfile
  readonly glassTuning: GlassTuning
}

export type StyleTokens = {
  readonly color: SeedPalette
  readonly typography: {
    readonly displayFamily: string
    readonly bodyFamily: string
    readonly monoFamily: string
    readonly displayWeight: number
    readonly bodySizePx: number
  }
  readonly space: {
    readonly safePct: number
    readonly widgetGapPct: number
  }
  readonly radius: {
    readonly sm: string
    readonly md: string
    readonly lg: string
  }
  readonly elevation: {
    readonly mode: ElevationMode
  }
  /** Profile + tuning + adaptive material (CSS-ready for WidgetSurface). */
  readonly glass: AdaptiveResolvedGlass
  readonly wallpaper: {
    readonly source: Wallpaper
    readonly dim: number
    /** CSS-ready fallback until generative/image/video engines mount (WS2). */
    readonly cssBackground: string
  }
  readonly motion: {
    readonly turnMs: number
    readonly ease: string
  }
}

export type StyleOverride = {
  readonly color?: Partial<SeedPalette>
  readonly typography?: Partial<StyleTokens["typography"]>
  readonly space?: Partial<StyleTokens["space"]>
  readonly radius?: Partial<StyleTokens["radius"]>
  readonly elevation?: Partial<StyleTokens["elevation"]>
  readonly motion?: Partial<StyleTokens["motion"]>
}

export type WidgetStyleOverride = StyleOverride
