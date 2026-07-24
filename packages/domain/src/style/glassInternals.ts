import { type Result, err, ok } from "../result/result"

export const GLASS_PROFILES = ["clear", "balanced", "deep"] as const
export type GlassProfile = (typeof GLASS_PROFILES)[number]

export const MOTION_PROFILES = ["calm", "balanced", "immersive"] as const
export type MotionProfile = (typeof MOTION_PROFILES)[number]

/** Protected advanced tuning offsets on top of a GlassProfile. */
export type GlassTuning = {
  readonly transmission: number
  readonly blur: number
  readonly saturation: number
  readonly highlight: number
}

export type GlassParseError = {
  readonly code: "invalid_profile" | "invalid_tuning" | "invalid_motion"
  readonly message: string
}

const TUNING_BOUNDS = {
  transmission: { min: -0.2, max: 0.2 },
  blur: { min: -12, max: 12 },
  saturation: { min: -0.4, max: 0.4 },
  highlight: { min: -0.25, max: 0.25 },
} as const

export const DEFAULT_GLASS_TUNING: GlassTuning = {
  transmission: 0,
  blur: 0,
  saturation: 0,
  highlight: 0,
}

export type GlassProfileBase = {
  readonly blurPx: number
  readonly opacity: number
  readonly highlight: number
  readonly saturation: number
}

export type GlassProfileBand = {
  readonly blurPx: {
    readonly min: number
    readonly max: number
  }
  readonly tintOpacity: {
    readonly min: number
    readonly max: number
  }
}

export const GLASS_PROFILE_BASE: Readonly<
  Record<GlassProfile, GlassProfileBase>
> = {
  clear: { blurPx: 16, opacity: 0.11, highlight: 0.4, saturation: 1.65 },
  balanced: { blurPx: 25, opacity: 0.2, highlight: 0.35, saturation: 1.7 },
  deep: { blurPx: 35, opacity: 0.34, highlight: 0.25, saturation: 1.55 },
}

export const GLASS_PROFILE_BANDS: Readonly<
  Record<GlassProfile, GlassProfileBand>
> = {
  clear: {
    blurPx: { min: 14, max: 18 },
    tintOpacity: { min: 0.08, max: 0.14 },
  },
  balanced: {
    blurPx: { min: 22, max: 28 },
    tintOpacity: { min: 0.16, max: 0.24 },
  },
  deep: {
    blurPx: { min: 30, max: 40 },
    tintOpacity: { min: 0.28, max: 0.4 },
  },
}

export function isGlassProfile(value: string): value is GlassProfile {
  return (GLASS_PROFILES as readonly string[]).includes(value)
}

export function isMotionProfile(value: string): value is MotionProfile {
  return (MOTION_PROFILES as readonly string[]).includes(value)
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max
}

function clampFinite(
  value: number,
  range: GlassProfileBand["blurPx"],
  fallback: number,
): number {
  const finite = Number.isFinite(value) ? value : fallback
  return Math.min(range.max, Math.max(range.min, finite))
}

export function clampGlassProfileTokens(
  profile: GlassProfile,
  tokens: {
    readonly blurPx: number
    readonly tintOpacity: number
  },
): {
  readonly blurPx: number
  readonly tintOpacity: number
} {
  const base = GLASS_PROFILE_BASE[profile]
  const band = GLASS_PROFILE_BANDS[profile]
  return {
    blurPx: clampFinite(tokens.blurPx, band.blurPx, base.blurPx),
    tintOpacity: clampFinite(
      tokens.tintOpacity,
      band.tintOpacity,
      base.opacity,
    ),
  }
}

export function createGlassTuning(
  input: Partial<GlassTuning> = {},
): Result<GlassTuning, GlassParseError> {
  const tuning: GlassTuning = {
    transmission: input.transmission ?? DEFAULT_GLASS_TUNING.transmission,
    blur: input.blur ?? DEFAULT_GLASS_TUNING.blur,
    saturation: input.saturation ?? DEFAULT_GLASS_TUNING.saturation,
    highlight: input.highlight ?? DEFAULT_GLASS_TUNING.highlight,
  }
  for (const key of Object.keys(
    TUNING_BOUNDS,
  ) as (keyof typeof TUNING_BOUNDS)[]) {
    const bound = TUNING_BOUNDS[key]
    if (!inRange(tuning[key], bound.min, bound.max)) {
      return err({
        code: "invalid_tuning",
        message: `${key} must be in [${bound.min}, ${bound.max}]`,
      })
    }
  }
  return ok(tuning)
}

export type ResolvedGlass = {
  readonly profile: GlassProfile
  readonly blurPx: number
  readonly opacity: number
  readonly highlight: number
  readonly saturation: number
  readonly enabled: true
  readonly tuning: GlassTuning
}

export type GlassComposition = {
  readonly profile: GlassProfile
  readonly blurPxBeforeProfileClamp: number
  readonly tintOpacityBeforeProfileClamp: number
  readonly highlight: number
  readonly saturation: number
  readonly tuning: GlassTuning
}

export function composeGlassBeforeProfileClamp(
  profile: GlassProfile,
  tuning: GlassTuning,
): GlassComposition {
  const base = GLASS_PROFILE_BASE[profile]
  const parsedTuning = createGlassTuning(tuning)
  const safeTuning = parsedTuning.ok ? parsedTuning.value : DEFAULT_GLASS_TUNING
  return {
    profile,
    blurPxBeforeProfileClamp: base.blurPx + safeTuning.blur,
    tintOpacityBeforeProfileClamp: base.opacity - safeTuning.transmission,
    highlight: Math.min(1, Math.max(0, base.highlight + safeTuning.highlight)),
    saturation: Math.max(0.5, base.saturation + safeTuning.saturation),
    tuning: safeTuning,
  }
}
