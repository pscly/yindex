import {
  type AdaptiveGlassInput,
  BALANCED_SAFE_ANALYSIS,
  parseAdaptiveGlassInput,
} from "@yindex/domain"
import { type PixelSample, analyzePixelSample } from "./wallpaperAnalysis"

export type PixelFrame = PixelSample

export type WallpaperAnalysisResult = {
  readonly analysis: AdaptiveGlassInput
  readonly usedFallback: boolean
}

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
  const analysis = analyzePixelSample(frame)
  return analysis === BALANCED_SAFE_ANALYSIS
    ? FALLBACK_RESULT
    : { analysis, usedFallback: false }
}
