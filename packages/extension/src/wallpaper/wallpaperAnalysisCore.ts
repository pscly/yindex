import {
  type AdaptiveGlassInput,
  BALANCED_SAFE_ANALYSIS,
  parseAdaptiveGlassInput,
} from "@yindex/domain"
import {
  type PixelAnalysisResult,
  type PixelSample,
  analyzePixelSample,
} from "./wallpaperAnalysis"

export type PixelFrame = PixelSample

export type WallpaperAnalysisResult = PixelAnalysisResult

const FALLBACK_RESULT: WallpaperAnalysisResult = {
  analysis: BALANCED_SAFE_ANALYSIS,
  usedFallback: true,
}

export function normalizeWallpaperAnalysis(
  input: AdaptiveGlassInput,
): WallpaperAnalysisResult {
  const parsed = parseAdaptiveGlassInput(input)
  return parsed.ok
    ? { analysis: parsed.value, usedFallback: false }
    : FALLBACK_RESULT
}

export function analyzePixelFrame(frame: PixelFrame): WallpaperAnalysisResult {
  return analyzePixelSample(frame)
}
