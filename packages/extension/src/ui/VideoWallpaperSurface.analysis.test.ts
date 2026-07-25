import { describe, expect, test } from "bun:test"
import { videoWallpaperAnalysisMode } from "./VideoWallpaperSurface"

describe("Video Wallpaper analysis cadence", () => {
  test("Given an inactive Page, When cadence resolves, Then no video analysis subscribes", () => {
    // Given / When
    const mode = videoWallpaperAnalysisMode(false, false)

    // Then
    expect(mode).toBe("inactive")
  })

  test("Given reduced motion, When cadence resolves, Then analysis captures one frame instead of recurring sampling", () => {
    // Given / When
    const mode = videoWallpaperAnalysisMode(true, true)

    // Then
    expect(mode).toBe("single-frame")
  })

  test("Given an active moving video, When cadence resolves, Then the bounded sampler is used", () => {
    // Given / When
    const mode = videoWallpaperAnalysisMode(true, false)

    // Then
    expect(mode).toBe("sampled")
  })
})
