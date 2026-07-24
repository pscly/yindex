import { type Result, err, ok } from "../result/result"
import {
  DEFAULT_GLASS_TUNING,
  type GlassProfile,
  type GlassTuning,
  createGlassTuning,
} from "./glass"
import type { PageStyle, SeedPalette } from "./types"
import {
  type GenerativePreset,
  type Wallpaper,
  createGenerativeWallpaper,
} from "./wallpaper"

export type PageStyleInput = {
  readonly seedPalette: SeedPalette
  readonly wallpaper: Wallpaper
  readonly glassProfile?: GlassProfile
  readonly glassTuning?: GlassTuning
}

export type PageStyleError = {
  readonly code: "invalid_glass"
  readonly message: string
}

export function createPageStyle(
  input: PageStyleInput,
): Result<PageStyle, PageStyleError> {
  const tuningR = createGlassTuning(input.glassTuning ?? DEFAULT_GLASS_TUNING)
  if (!tuningR.ok) {
    return err({ code: "invalid_glass", message: tuningR.error.message })
  }
  return ok({
    seedPalette: input.seedPalette,
    wallpaper: input.wallpaper,
    glassProfile: input.glassProfile ?? "balanced",
    glassTuning: tuningR.value,
  })
}

export function createGenerativePageStyle(input: {
  readonly seedPalette: SeedPalette
  readonly generativePreset: GenerativePreset
  readonly dim?: number
  readonly glassProfile?: GlassProfile
  readonly glassTuning?: GlassTuning
}): Result<
  PageStyle,
  PageStyleError | { readonly code: string; readonly message: string }
> {
  const wallR = createGenerativeWallpaper({
    generativePreset: input.generativePreset,
    dim: input.dim ?? 0.18,
  })
  if (!wallR.ok) return wallR
  const styleInput: PageStyleInput = {
    seedPalette: input.seedPalette,
    wallpaper: wallR.value,
    glassProfile: input.glassProfile ?? "balanced",
    glassTuning: input.glassTuning ?? DEFAULT_GLASS_TUNING,
  }
  return createPageStyle(styleInput)
}

/** Default balanced liquid-glass page style (neutral seed). */
export function defaultPageStyle(): PageStyle {
  const r = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.16 0.02 250)",
      surface: "oklch(0.28 0.03 250 / 0.5)",
      ink: "oklch(0.96 0.01 250)",
      muted: "oklch(0.78 0.02 250)",
      accent: "oklch(0.62 0.1 240)",
    },
    generativePreset: "moment",
    dim: 0.15,
    glassProfile: "balanced",
  })
  if (!r.ok) {
    throw new Error(`defaultPageStyle invariant failed: ${r.error.message}`)
  }
  return r.value
}
