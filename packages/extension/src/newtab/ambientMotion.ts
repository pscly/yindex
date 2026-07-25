import type { MotionProfile } from "@yindex/domain"
import { MOTION_PROFILE_TABLE } from "./pageTurnPolicy"

export type ReducedMotionSetting = "system" | "force" | "never"

export type AmbientMotionInput = {
  readonly reducedMotionSetting: ReducedMotionSetting
  readonly osPrefersReduced: boolean
  readonly pageActive: boolean
}

export type AmbientHighlightInput = {
  readonly profile: MotionProfile
  readonly allowed: boolean
  readonly pageActive: boolean
}

export type AmbientHighlightStyle = {
  readonly "--yindex-highlight-drift-sec"?: string
}

export type MotionPreferenceQuery = (query: string) => {
  readonly matches: boolean
}

export function ambientMotionAllowed(
  setting: ReducedMotionSetting,
  matchMedia?: MotionPreferenceQuery,
): boolean
export function ambientMotionAllowed(input: AmbientMotionInput): boolean
export function ambientMotionAllowed(
  settingOrInput: ReducedMotionSetting | AmbientMotionInput,
  matchMedia?: MotionPreferenceQuery,
): boolean {
  if (typeof settingOrInput !== "string") {
    if (!settingOrInput.pageActive || settingOrInput.osPrefersReduced) {
      return false
    }
    return settingOrInput.reducedMotionSetting !== "force"
  }

  if (settingOrInput === "force") return false
  const query =
    matchMedia ??
    (typeof window !== "undefined" ? window.matchMedia.bind(window) : undefined)
  return !query?.("(prefers-reduced-motion: reduce)").matches
}

export function highlightDriftPeriodSec(profile: MotionProfile): number | null {
  return MOTION_PROFILE_TABLE[profile].highlightDriftSec
}

export function ambientHighlightStyle(
  input: AmbientHighlightInput,
): AmbientHighlightStyle {
  const period = highlightDriftPeriodSec(input.profile)
  if (period === null || !input.allowed || !input.pageActive) return {}
  return { "--yindex-highlight-drift-sec": `${period}s` }
}
