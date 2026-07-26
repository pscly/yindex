import type { BrowserContext, CDPSession, Page } from "@playwright/test"
import type { CspViolation } from "./extension.perf-lifecycle.helpers"
import type { RendererActivity } from "./extension.perf-lifecycle.page"

export type HeapProfile = {
  readonly dialogCycles: number
  readonly finalGrowthMiB: number
  readonly materiallyMonotonic: boolean
  readonly materialStepMiB: number
  readonly peakGrowthMiB: number
  readonly samplesMiB: readonly number[]
}

export type PageTurnProfile = {
  readonly forwardMedianMs: number
  readonly forwardMs: readonly number[]
  readonly forwardTurnsWithLongFrames: number
  readonly loafSupported: boolean
  readonly longAnimationFramesMs: readonly number[]
  readonly reducedMedianMs: number
  readonly reducedMotionMs: readonly number[]
  readonly reverseMedianMs: number
  readonly reverseMs: readonly number[]
  readonly reverseTurnsWithLongFrames: number
}

export type WallpaperFrameProfile = {
  readonly hiddenRafGrowth: number
  readonly hiddenTransitions: number
  readonly hiddenWallpaperDrawGrowth: number
  readonly inactiveTabTransitions: number
  readonly inactiveTabWallpaperDrawGrowth: number
  readonly inactiveWallpaperDrawGrowth: number
  readonly idleRafGrowth: number
  readonly visibleFrameGrowth: number
  readonly visibleWallpaperDrawGrowth: number
}

export type InteractionProfile = {
  readonly heap: HeapProfile
  readonly pageTurns: PageTurnProfile
  readonly rendererActivity: RendererActivity
  readonly traces: Readonly<Record<string, number>>
  readonly wallpaperFrames: WallpaperFrameProfile
}

export type ProfiledHome = {
  readonly coldOpenMs: number
  readonly context: BrowserContext
  readonly cspViolations: CspViolation[]
  readonly page: Page
  readonly runId: string
  readonly session: CDPSession
  readonly traces: Readonly<Record<string, number>>
  readonly warmOpenMs: number
}

export type HomeLifecycleProfile = InteractionProfile & {
  readonly coldOpenMs: number
  readonly cspViolations: CspViolation[]
  readonly warmOpenMs: number
}
