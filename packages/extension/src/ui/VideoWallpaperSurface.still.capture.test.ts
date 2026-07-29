import { describe, expect, test } from "bun:test"
import {
  captureVideoWallpaperStill,
  resolveVideoStillCaptureSize,
  scaleVideoStillDimensions,
} from "./VideoWallpaperSurface"

describe("Video Wallpaper still capture", () => {
  test("Given a large decoded frame, When analysis-bound scaling is requested, Then dimensions stay within 64", () => {
    // Given / When
    const size = scaleVideoStillDimensions(1920, 1080, 64)

    // Then
    expect(size).toEqual({ width: 64, height: 36 })
  })

  test("Given a modest frame, When display still capture runs, Then it does not upscale", async () => {
    // Given
    const created: Blob[] = []
    const drawSizes: Array<{ width: number; height: number }> = []

    // When
    const still = await captureVideoWallpaperStill(
      { readyState: 2, videoWidth: 320, videoHeight: 180 },
      {
        drawStill: async (size) => {
          drawSizes.push(size)
          return new Blob([new Uint8Array([137, 80, 78, 71])], {
            type: "image/png",
          })
        },
        createObjectUrl: (blob) => {
          created.push(blob)
          return "blob:still-once"
        },
      },
    )

    // Then
    expect(still).toEqual({
      objectUrl: "blob:still-once",
      width: 320,
      height: 180,
    })
    expect(created).toHaveLength(1)
    expect(drawSizes).toEqual([{ width: 320, height: 180 }])
  })

  test("Given no current frame, When capture is requested, Then it fails before draw or URL creation", async () => {
    // Given
    let creates = 0
    let draws = 0

    // When / Then
    await expect(
      captureVideoWallpaperStill(
        { readyState: 0, videoWidth: 0, videoHeight: 0 },
        {
          createObjectUrl: () => {
            creates += 1
            return "blob:unexpected"
          },
          drawStill: async () => {
            draws += 1
            return new Blob([new Uint8Array([1])], { type: "image/png" })
          },
        },
      ),
    ).rejects.toThrow("video has no current frame")
    expect(creates).toBe(0)
    expect(draws).toBe(0)
  })

  test("Given a failed encode, When capture runs, Then no object URL is created", async () => {
    // Given
    let creates = 0

    // When / Then
    await expect(
      captureVideoWallpaperStill(
        { readyState: 2, videoWidth: 64, videoHeight: 64 },
        {
          drawStill: async () => null,
          createObjectUrl: () => {
            creates += 1
            return "blob:unexpected"
          },
        },
      ),
    ).rejects.toThrow("still encode failed")
    expect(creates).toBe(0)
  })

  test("Given an oversized frame, When display capture resolves, Then long edge is capped and aspect ratio is preserved", () => {
    // Given / When
    const size = resolveVideoStillCaptureSize({
      readyState: 2,
      videoWidth: 3840,
      videoHeight: 2160,
    })

    // Then
    expect(size).toEqual({ width: 1280, height: 720 })
    expect(size.width / size.height).toBeCloseTo(16 / 9, 5)
    expect(Math.max(size.width, size.height)).toBeGreaterThan(64)
  })

  test("Given non-finite dimensions, When capture is requested, Then it rejects before draw or URL creation", async () => {
    // Given
    let creates = 0
    let draws = 0
    const cases = [
      { readyState: 2, videoWidth: Number.NaN, videoHeight: 1080 },
      {
        readyState: 2,
        videoWidth: 1920,
        videoHeight: Number.POSITIVE_INFINITY,
      },
      { readyState: 2, videoWidth: -10, videoHeight: 720 },
    ] as const

    // When / Then
    for (const video of cases) {
      await expect(
        captureVideoWallpaperStill(video, {
          createObjectUrl: () => {
            creates += 1
            return "blob:unexpected"
          },
          drawStill: async () => {
            draws += 1
            return new Blob([new Uint8Array([1])], { type: "image/png" })
          },
        }),
      ).rejects.toThrow()
    }
    expect(creates).toBe(0)
    expect(draws).toBe(0)
  })
})
