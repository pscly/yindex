/**
 * Public Wallpaper analysis API for WallpaperStage and Settings consumers.
 * Image/video work is asynchronous so callers can paint before analysis settles.
 */
import type { GenerativePreset } from "@yindex/domain"
import { getGenerativePreset } from "./generativePresets"
import {
  type PixelFrame,
  type WallpaperAnalysisResult,
  analyzePixelFrame,
  normalizeWallpaperAnalysis,
} from "./wallpaperAnalysisCore"
import {
  ANALYZER_VERSION,
  MAX_ANALYSIS_DIMENSION,
  type StaticImageAnalyzer,
  type StaticImageAsset,
  createStaticImageAnalyzer,
} from "./wallpaperImageAnalysis"
import {
  type AnalysisTimer,
  type TemporalAnalysisFilter,
  type VideoWallpaperSampler,
  createTemporalAnalysisFilter,
  createVideoWallpaperSampler,
} from "./wallpaperVideoAnalysis"

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function analyzeGenerativeWallpaper(
  preset: GenerativePreset,
): WallpaperAnalysisResult {
  const descriptor = getGenerativePreset(preset)
  const luminance = (descriptor.lightnessMin + descriptor.lightnessMax) / 2
  const range = descriptor.lightnessMax - descriptor.lightnessMin
  return normalizeWallpaperAnalysis({
    luminance,
    chroma: clamp01(descriptor.chroma * 5),
    detail: clamp01(
      range * 1.5 +
        descriptor.noiseScale * 0.15 +
        descriptor.speed * 0.1 +
        descriptor.auroraHues.length * 0.18,
    ),
  })
}

export {
  ANALYZER_VERSION,
  MAX_ANALYSIS_DIMENSION,
  analyzePixelFrame,
  createStaticImageAnalyzer,
  createTemporalAnalysisFilter,
  createVideoWallpaperSampler,
  normalizeWallpaperAnalysis,
}
export type {
  AnalysisTimer,
  PixelFrame,
  StaticImageAnalyzer,
  StaticImageAsset,
  TemporalAnalysisFilter,
  VideoWallpaperSampler,
  WallpaperAnalysisResult,
}
