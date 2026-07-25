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
    const analysis = analyzePixelSample(fixture)

    // Then
    expect(analysis.luminance).toBeCloseTo(1, 6)
    expect(analysis.chroma).toBe(0)
    expect(analysis.detail).toBe(0)
  })

  test("reports low luminance for a dark fixture", () => {
    // Given
    const fixture = solidSample(0, 0, 0)

    // When
    const analysis = analyzePixelSample(fixture)

    // Then
    expect(analysis.luminance).toBe(0)
    expect(analysis.chroma).toBe(0)
    expect(analysis.detail).toBe(0)
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
    const analysis = analyzePixelSample(fixture)

    // Then
    expect(analysis.luminance).toBeCloseTo(0.5, 6)
    expect(analysis.detail).toBeCloseTo(1, 6)
  })

  test("uses the Domain balanced-safe analysis for non-finite pixels", () => {
    // Given
    const fixture = solidSample(Number.NaN, 32, 64)

    // When
    const analysis = analyzePixelSample(fixture)

    // Then
    expect(analysis).toEqual(BALANCED_SAFE_ANALYSIS)
  })
})
