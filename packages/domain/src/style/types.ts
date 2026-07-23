import type { StylePackId } from "../ids/ids"

export type ElevationMode = "flat" | "tonal" | "glass"

export type WallpaperKind = "image" | "video" | "gradient" | "generative"

export type StyleTokens = {
  readonly color: {
    readonly bg: string
    readonly surface: string
    readonly ink: string
    readonly muted: string
    readonly accent: string
    readonly [key: string]: string
  }
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
  readonly glass: {
    readonly blurPx: number
    readonly opacity: number
    readonly highlight: number
    readonly enabled: boolean
  }
  readonly wallpaper: {
    readonly kind: WallpaperKind
    readonly fit: "cover"
    readonly dim: number
    readonly value?: string
  }
  readonly motion: {
    readonly turnMs: number
    readonly ease: string
  }
}

export type StyleOverride = {
  readonly color?: Partial<StyleTokens["color"]>
  readonly typography?: Partial<StyleTokens["typography"]>
  readonly space?: Partial<StyleTokens["space"]>
  readonly radius?: Partial<StyleTokens["radius"]>
  readonly elevation?: Partial<StyleTokens["elevation"]>
  readonly glass?: Partial<StyleTokens["glass"]>
  readonly wallpaper?: Partial<StyleTokens["wallpaper"]>
  readonly motion?: Partial<StyleTokens["motion"]>
}

export type PageStyle = {
  readonly packId: StylePackId
  readonly overrides: StyleOverride
}

export type WidgetStyleOverride = StyleOverride
