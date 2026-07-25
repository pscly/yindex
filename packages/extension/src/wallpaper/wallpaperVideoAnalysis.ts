import { type AdaptiveGlassInput, BALANCED_SAFE_ANALYSIS } from "@yindex/domain"
import {
  type PixelFrame,
  type WallpaperAnalysisResult,
  analyzePixelFrame,
  normalizeWallpaperAnalysis,
} from "./wallpaperAnalysisCore"

const VIDEO_SAMPLE_INTERVAL_MS = 1000

export type TemporalAnalysisFilter = {
  update(input: AdaptiveGlassInput): AdaptiveGlassInput
}

type TemporalAnalysisOptions = {
  readonly smoothing?: number
  readonly hysteresis?: number
}

function blend(previous: number, next: number, smoothing: number): number {
  return previous + (next - previous) * smoothing
}

function stable(previous: number, next: number, hysteresis: number): number {
  return Math.abs(next - previous) < hysteresis ? previous : next
}

export function createTemporalAnalysisFilter(
  options: TemporalAnalysisOptions = {},
): TemporalAnalysisFilter {
  const smoothing = options.smoothing ?? 0.25
  const hysteresis = options.hysteresis ?? 0.025
  let published: AdaptiveGlassInput | undefined
  return {
    update(input) {
      const normalized = normalizeWallpaperAnalysis(input).analysis
      if (published === undefined) {
        published = normalized
        return published
      }
      const next = {
        luminance: stable(
          published.luminance,
          blend(published.luminance, normalized.luminance, smoothing),
          hysteresis,
        ),
        chroma: stable(
          published.chroma,
          blend(published.chroma, normalized.chroma, smoothing),
          hysteresis,
        ),
        detail: stable(
          published.detail,
          blend(published.detail, normalized.detail, smoothing),
          hysteresis,
        ),
      }
      published = next
      return published
    },
  }
}

export type AnalysisTimer = {
  schedule(task: () => void, delayMs: number): unknown
  cancel(handle: unknown): void
}

type VideoWallpaperSamplerOptions = {
  readonly sample: () => Promise<PixelFrame>
  readonly onAnalysis: (result: WallpaperAnalysisResult) => void
  readonly timer?: AnalysisTimer
  readonly filter?: TemporalAnalysisFilter
}

export type VideoWallpaperSampler = {
  start(): void
  dispose(): void
}

const browserTimer: AnalysisTimer = {
  schedule: (task, delayMs) => globalThis.setTimeout(task, delayMs),
  cancel: (handle) => {
    if (typeof handle === "number") globalThis.clearTimeout(handle)
  },
}

export function createVideoWallpaperSampler(
  options: VideoWallpaperSamplerOptions,
): VideoWallpaperSampler {
  const timer = options.timer ?? browserTimer
  const filter = options.filter ?? createTemporalAnalysisFilter()
  let active = false
  let handle: unknown

  const schedule = (delayMs: number): void => {
    handle = timer.schedule(() => {
      handle = undefined
      if (!active) return
      options
        .sample()
        .then(analyzePixelFrame)
        .then((result) => {
          if (!active) return
          const analysis = filter.update(result.analysis)
          options.onAnalysis({ analysis, usedFallback: result.usedFallback })
          schedule(VIDEO_SAMPLE_INTERVAL_MS)
        })
        .catch(() => {
          if (!active) return
          options.onAnalysis({
            analysis: BALANCED_SAFE_ANALYSIS,
            usedFallback: true,
          })
          schedule(VIDEO_SAMPLE_INTERVAL_MS)
        })
    }, delayMs)
  }

  return {
    start() {
      if (active) return
      active = true
      schedule(0)
    },
    dispose() {
      active = false
      if (handle !== undefined) timer.cancel(handle)
      handle = undefined
    },
  }
}
