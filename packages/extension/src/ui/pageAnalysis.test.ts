import { describe, expect, test } from "bun:test"
import { BALANCED_SAFE_ANALYSIS, createImageWallpaper } from "@yindex/domain"
import {
  adaptiveAnalysisOf,
  pageAnalysisResult,
  wallpaperAnalysisKey,
} from "./pageAnalysis"

function imageWallpaperFixture() {
  const parsed = createImageWallpaper({
    mediaRef: "fixture-image",
    dim: 0.2,
  })
  if (!parsed.ok) throw new Error(parsed.error.message)
  return parsed.value
}

describe("Page-local Wallpaper analysis", () => {
  test("Given a ready image analysis, When the Page resolves its publication, Then the Adaptive Glass argument is non-null", () => {
    // Given
    const wallpaper = imageWallpaperFixture()
    const analysis = { luminance: 0.88, chroma: 0.08, detail: 0.1 }

    // When
    const result = pageAnalysisResult({
      wallpaper,
      active: true,
      published: {
        sourceKey: wallpaperAnalysisKey(wallpaper),
        result: { analysis, usedFallback: false },
      },
    })

    // Then
    expect(adaptiveAnalysisOf(result)).toEqual(analysis)
  })

  test("Given analyzer fallback, When the Page resolves its publication, Then the Domain balanced-safe path remains authoritative", () => {
    // Given
    const wallpaper = imageWallpaperFixture()

    // When
    const result = pageAnalysisResult({
      wallpaper,
      active: true,
      published: {
        sourceKey: wallpaperAnalysisKey(wallpaper),
        result: {
          analysis: BALANCED_SAFE_ANALYSIS,
          usedFallback: true,
        },
      },
    })

    // Then
    expect(result?.usedFallback).toBe(true)
    expect(adaptiveAnalysisOf(result)).toBeNull()
  })

  test("Given one visible mount and one fresh Loop clone, When Page-local publications resolve, Then only the visible mount has live analysis", () => {
    // Given
    const wallpaper = imageWallpaperFixture()
    const analysis = { luminance: 0.14, chroma: 0.05, detail: 0.12 }

    // When
    const visible = pageAnalysisResult({
      wallpaper,
      active: true,
      published: {
        sourceKey: wallpaperAnalysisKey(wallpaper),
        result: { analysis, usedFallback: false },
      },
    })
    const clone = pageAnalysisResult({
      wallpaper,
      active: false,
      published: null,
    })

    // Then
    expect(adaptiveAnalysisOf(visible)).toEqual(analysis)
    expect(clone).toBeNull()
  })
})
