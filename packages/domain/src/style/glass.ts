import {
  type GlassProfile,
  type GlassTuning,
  type ResolvedGlass,
  clampGlassProfileTokens,
  composeGlassBeforeProfileClamp,
} from "./glassInternals"

export {
  DEFAULT_GLASS_TUNING,
  GLASS_PROFILES,
  GLASS_PROFILE_BANDS,
  GLASS_PROFILE_BASE,
  GLASS_TUNING_BOUNDS,
  MOTION_PROFILES,
  clampGlassProfileTokens,
  createGlassTuning,
  isGlassProfile,
  isMotionProfile,
} from "./glassInternals"
export type {
  GlassParseError,
  GlassProfile,
  GlassProfileBand,
  GlassProfileBase,
  GlassTuning,
  MotionProfile,
  ResolvedGlass,
} from "./glassInternals"

export function resolveGlass(
  profile: GlassProfile,
  tuning: GlassTuning,
): ResolvedGlass {
  const composition = composeGlassBeforeProfileClamp(profile, tuning)
  const bounded = clampGlassProfileTokens(profile, {
    blurPx: composition.blurPxBeforeProfileClamp,
    tintOpacity: composition.tintOpacityBeforeProfileClamp,
  })
  return {
    profile: composition.profile,
    blurPx: bounded.blurPx,
    opacity: bounded.tintOpacity,
    highlight: composition.highlight,
    saturation: composition.saturation,
    enabled: true,
    tuning: composition.tuning,
  }
}
