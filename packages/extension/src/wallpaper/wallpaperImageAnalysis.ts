import { BALANCED_SAFE_ANALYSIS } from "@yindex/domain"
import {
  type PixelFrame,
  type WallpaperAnalysisResult,
  analyzePixelFrame,
} from "./wallpaperAnalysisCore"

export const ANALYZER_VERSION = "wallpaper-analysis-v1"
export const MAX_ANALYSIS_DIMENSION = 64

export type StaticImageAsset = {
  readonly contentHash: string
  readonly blob: Blob
}

export type StaticImageAnalyzer = {
  analyze(asset: StaticImageAsset): Promise<WallpaperAnalysisResult>
  cacheKey(contentHash: string): string
  clear(): void
}

type StaticImageAnalyzerDependencies = {
  readonly sampleImage?: (
    blob: Blob,
    maxDimension: number,
  ) => Promise<PixelFrame>
}

const FALLBACK_RESULT: WallpaperAnalysisResult = {
  analysis: BALANCED_SAFE_ANALYSIS,
  usedFallback: true,
}

function cacheKey(contentHash: string): string {
  return `${ANALYZER_VERSION}:${contentHash}`
}

async function sampleImageBitmap(
  blob: Blob,
  maxDimension: number,
): Promise<PixelFrame> {
  const source = await createImageBitmap(blob)
  try {
    if (source.width <= 0 || source.height <= 0)
      return { width: 0, height: 0, data: [] }
    const scale = Math.min(
      1,
      maxDimension / Math.max(source.width, source.height),
    )
    const width = Math.max(1, Math.round(source.width * scale))
    const height = Math.max(1, Math.round(source.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (context === null) return { width: 0, height: 0, data: [] }
    context.drawImage(source, 0, 0, width, height)
    const image = context.getImageData(0, 0, width, height)
    return { width, height, data: image.data }
  } finally {
    source.close()
  }
}

export function createStaticImageAnalyzer(
  dependencies: StaticImageAnalyzerDependencies = {},
): StaticImageAnalyzer {
  const cache = new Map<string, Promise<WallpaperAnalysisResult>>()
  const sampleImage = dependencies.sampleImage ?? sampleImageBitmap
  return {
    analyze(asset) {
      const key = cacheKey(asset.contentHash)
      const cached = cache.get(key)
      if (cached !== undefined) return cached
      const pending = Promise.resolve()
        .then(() => sampleImage(asset.blob, MAX_ANALYSIS_DIMENSION))
        .then(analyzePixelFrame)
        .catch(() => FALLBACK_RESULT)
      cache.set(key, pending)
      return pending
    },
    cacheKey,
    clear() {
      cache.clear()
    },
  }
}
