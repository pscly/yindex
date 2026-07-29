import { describe, expect, test } from "bun:test"
import { BALANCED_SAFE_ANALYSIS } from "@yindex/domain"
import { analyzePixelSample } from "./wallpaperAnalysis"

function solidSample(red: number, green: number, blue: number) {
  return {
    width: 2,
    height: 2,
    data: [
      red,
      green,
      blue,
      255,
      red,
      green,
      blue,
      255,
      red,
      green,
      blue,
      255,
      red,
      green,
      blue,
      255,
    ],
  }
}

describe("Wallpaper pixel analysis", () => {
  test("reports high luminance for a bright fixture", () => {
    // Given
    const fixture = solidSample(255, 255, 255)

    // When
    const result = analyzePixelSample(fixture)

    // Then
    expect(result.analysis.luminance).toBeCloseTo(1, 6)
    expect(result.analysis.chroma).toBe(0)
    expect(result.analysis.detail).toBe(0)
    expect(result.usedFallback).toBe(false)
  })

  test("reports low luminance for a dark fixture", () => {
    // Given
    const fixture = solidSample(0, 0, 0)

    // When
    const result = analyzePixelSample(fixture)

    // Then
    expect(result.analysis.luminance).toBe(0)
    expect(result.analysis.chroma).toBe(0)
    expect(result.analysis.detail).toBe(0)
    expect(result.usedFallback).toBe(false)
  })

  test("reports high edge energy for a detailed fixture", () => {
    // Given
    const fixture = {
      width: 2,
      height: 2,
      data: [
        0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255,
      ],
    }

    // When
    const result = analyzePixelSample(fixture)

    // Then
    expect(result.analysis.luminance).toBeCloseTo(0.5, 6)
    expect(result.analysis.detail).toBeCloseTo(1, 6)
    expect(result.usedFallback).toBe(false)
  })

  test("uses the Domain balanced-safe analysis for non-finite pixels", () => {
    // Given
    const fixture = solidSample(Number.NaN, 32, 64)

    // When
    const result = analyzePixelSample(fixture)

    // Then
    expect(result.analysis).toEqual(BALANCED_SAFE_ANALYSIS)
  })

  test("reports fallback provenance for an invalid pixel sample", () => {
    // Given
    const fixture = solidSample(Number.NaN, 32, 64)

    // When
    const result = analyzePixelSample(fixture)

    // Then
    expect(result).toEqual({
      analysis: BALANCED_SAFE_ANALYSIS,
      usedFallback: true,
    })
  })
})
