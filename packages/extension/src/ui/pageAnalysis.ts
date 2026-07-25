import type { AdaptiveGlassInput, Wallpaper } from "@yindex/domain"
import { assertNever } from "@yindex/domain"
import {
  type WallpaperAnalysisResult,
  analyzeGenerativeWallpaper,
} from "../wallpaper/wallpaperAnalyzer"

export type PageAnalysisPublication = {
  readonly sourceKey: string
  readonly result: WallpaperAnalysisResult
}

export function wallpaperAnalysisKey(wallpaper: Wallpaper): string {
  switch (wallpaper.kind) {
    case "generative":
      return `generative:${wallpaper.generativePreset}`
    case "image":
      return `image:${wallpaper.mediaRef}`
    case "video":
      return `video:${wallpaper.mediaRef}`
    default:
      return assertNever(wallpaper)
  }
}

export function pageAnalysisResult(input: {
  readonly wallpaper: Wallpaper
  readonly active: boolean
  readonly published: PageAnalysisPublication | null
}): WallpaperAnalysisResult | null {
  const sourceKey = wallpaperAnalysisKey(input.wallpaper)
  if (input.published?.sourceKey === sourceKey) return input.published.result
  if (!input.active || input.wallpaper.kind !== "generative") return null
  return analyzeGenerativeWallpaper(input.wallpaper.generativePreset)
}

export function adaptiveAnalysisOf(
  result: WallpaperAnalysisResult | null,
): AdaptiveGlassInput | null {
  return result !== null && !result.usedFallback ? result.analysis : null
}
