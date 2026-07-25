import type { MotionProfile } from "@yindex/domain"

export const PAGE_TURN_POLICY = {
  /** Coherent scroll before direction locks */
  directionLockPx: 12,
  /** Full page progress span as fraction of viewport height */
  progressViewportFraction: 0.65,
  /** Absolute progress commit threshold */
  commitProgress: 0.22,
  /** Lower progress allowed when flick velocity is high */
  flickMinProgress: 0.08,
  /** pages per second */
  flickMinVelocity: 0.7,
  /** Discrete mouse wheel notch / coarse burst size (px) */
  coarseBurstPx: 80,
  /** After a committed turn, absorb further wheel for this long */
  cooldownMs: 180,
  /** Silence after last wheel sample → decide commit/return */
  idleReleaseMs: 90,
  reducedMotionMs: 120,
  /** Reduced-motion max strip travel as fraction of one page */
  reducedMotionMaxOffset: 0.04,
  /** Velocity EMA time constant (ms) */
  velocityEmaMs: 40,
} as const

export type SpringParams = {
  readonly stiffness: number
  readonly damping: number
  readonly mass: number
}

export const SPRING_BASE: SpringParams = {
  stiffness: 180,
  damping: 26,
  mass: 1,
} as const

export type MotionProfileValues = {
  /** Multiplies spring stiffness; damping scaled √scale to keep near-critical ratio */
  readonly springScale: number
  /** Max parallax as fraction of viewport (immersive only, ≤0.03) */
  readonly parallaxMax: number
  readonly highlightDriftSec: number | null
}

export const MOTION_PROFILE_TABLE: Readonly<
  Record<MotionProfile, MotionProfileValues>
> = {
  calm: { springScale: 0.7, parallaxMax: 0, highlightDriftSec: null },
  balanced: { springScale: 1, parallaxMax: 0, highlightDriftSec: 36 },
  immersive: {
    springScale: 1.15,
    parallaxMax: 0.03,
    highlightDriftSec: 24,
  },
} as const

export function springParamsForProfile(profile: MotionProfile): SpringParams {
  const { springScale } = MOTION_PROFILE_TABLE[profile]
  const stiffness = SPRING_BASE.stiffness * springScale
  // Keep damping ratio: ζ = c / (2√(k m)); scale c by √springScale
  const damping = SPRING_BASE.damping * Math.sqrt(springScale)
  return {
    stiffness,
    damping,
    mass: SPRING_BASE.mass,
  }
}

export function parallaxMaxForProfile(profile: MotionProfile): number {
  return MOTION_PROFILE_TABLE[profile].parallaxMax
}
