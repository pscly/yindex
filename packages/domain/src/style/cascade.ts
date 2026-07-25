import { assertNever } from "../result/result"
import {
  type AdaptiveGlassInput,
  resolveGlassWithAdaptive,
} from "./adaptiveGlass"
import type { GlassProfile, GlassTuning } from "./glass"
import type {
  PageStyle,
  StyleOverride,
  StyleTokens,
  WidgetStyleOverride,
} from "./types"
import type { GenerativePreset, Wallpaper } from "./wallpaper"

const DISPLAY_FAMILY =
  '"Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif'
const SERIF_DISPLAY_FAMILY =
  '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif'
const BODY_FAMILY =
  '"Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif'
const MONO_FAMILY = '"JetBrains Mono", "SF Mono", ui-monospace, monospace'

/** CSS fallbacks for generative light-fields until WS2 mounts the engine. */
const GENERATIVE_CSS = {
  moment:
    "radial-gradient(ellipse at 30% 20%, oklch(0.88 0.04 230), oklch(0.72 0.05 250) 45%, oklch(0.55 0.06 260) 100%)",
  muse: "radial-gradient(ellipse at 40% 30%, oklch(0.34 0.04 50), oklch(0.22 0.03 40) 55%, oklch(0.16 0.025 35) 100%)",
  flow: "radial-gradient(ellipse at 50% 40%, oklch(0.26 0.06 260), oklch(0.14 0.04 270) 60%), radial-gradient(circle at 80% 70%, oklch(0.35 0.08 180 / 0.35), transparent 45%), radial-gradient(circle at 20% 80%, oklch(0.3 0.08 320 / 0.3), transparent 40%)",
} as const satisfies Readonly<Record<GenerativePreset, string>>

export function wallpaperCssBackground(wallpaper: Wallpaper): string {
  switch (wallpaper.kind) {
    case "generative": {
      const presetCss = GENERATIVE_CSS[wallpaper.generativePreset]
      const momentCss = GENERATIVE_CSS.moment
      return presetCss ?? momentCss ?? ""
    }
    case "image":
      return `url(media:${wallpaper.mediaRef})`
    case "video":
      return `url(media:${wallpaper.mediaRef})`
    default:
      return assertNever(wallpaper)
  }
}

/**
 * Resolve Page Style → StyleTokens.
 * Optional wallpaper analysis drives Adaptive Glass; absent → balanced-safe fallback.
 */
export function pageStyleToTokens(
  pageStyle: PageStyle,
  analysis?: AdaptiveGlassInput | null,
): StyleTokens {
  const glass = resolveGlassWithAdaptive(
    pageStyle.glassProfile,
    pageStyle.glassTuning,
    analysis,
  )
  const dim = Number(pageStyle.wallpaper.dim)
  return {
    color: pageStyle.seedPalette,
    typography: {
      displayFamily:
        pageStyle.typographyMood === "serif"
          ? SERIF_DISPLAY_FAMILY
          : DISPLAY_FAMILY,
      bodyFamily: BODY_FAMILY,
      monoFamily: MONO_FAMILY,
      displayWeight: 200,
      bodySizePx: 15,
    },
    space: { safePct: 3, widgetGapPct: 1.5 },
    radius: { sm: "16px", md: "22px", lg: "28px" },
    elevation: { mode: "glass" },
    glass,
    wallpaper: {
      source: pageStyle.wallpaper,
      dim,
      cssBackground: wallpaperCssBackground(pageStyle.wallpaper),
    },
    motion: {
      turnMs: 420,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  }
}

function mergePartial<T extends object>(
  base: T,
  patch: Partial<T> | undefined,
): T {
  if (!patch) return base
  return { ...base, ...patch }
}

export function applyOverride(
  base: StyleTokens,
  override: StyleOverride,
): StyleTokens {
  return {
    color: mergePartial(base.color, override.color),
    typography: mergePartial(base.typography, override.typography),
    space: mergePartial(base.space, override.space),
    radius: mergePartial(base.radius, override.radius),
    elevation: mergePartial(base.elevation, override.elevation),
    glass: base.glass,
    wallpaper: base.wallpaper,
    motion: mergePartial(base.motion, override.motion),
  }
}

export function resolvePageTokens(pageStyle: PageStyle): StyleTokens {
  return pageStyleToTokens(pageStyle)
}

export function resolveWidgetTokens(
  pageTokens: StyleTokens,
  instanceOverride: WidgetStyleOverride | null | undefined,
): StyleTokens {
  if (!instanceOverride) return pageTokens
  return applyOverride(pageTokens, instanceOverride)
}

export function withGlassProfile(
  pageStyle: PageStyle,
  glassProfile: GlassProfile,
): PageStyle {
  return { ...pageStyle, glassProfile }
}

export function withGlassTuning(
  pageStyle: PageStyle,
  glassTuning: GlassTuning,
): PageStyle {
  return { ...pageStyle, glassTuning }
}

export function withWallpaper(
  pageStyle: PageStyle,
  wallpaper: Wallpaper,
): PageStyle {
  return { ...pageStyle, wallpaper }
}

export function withSeedPalette(
  pageStyle: PageStyle,
  seedPalette: PageStyle["seedPalette"],
): PageStyle {
  return { ...pageStyle, seedPalette }
}
