import { describe, expect, test } from "bun:test"
import { BALANCED_SAFE_ANALYSIS } from "@yindex/domain"
import {
  ANALYZER_VERSION,
  type PixelFrame,
  type WallpaperAnalysisResult,
  analyzeGenerativeWallpaper,
  createStaticImageAnalyzer,
  createTemporalAnalysisFilter,
  createVideoWallpaperSampler,
  normalizeWallpaperAnalysis,
} from "./wallpaperAnalyzer"

function solidFrame(value: number): PixelFrame {
  return {
    width: 1,
    height: 1,
    data: [value, value, value, 255],
  }
}

describe("Wallpaper analyzer host contracts", () => {
  test("rejects non-finite and out-of-range analysis", () => {
    // Given / When
    const nonFinite = normalizeWallpaperAnalysis({
      luminance: Number.NaN,
      chroma: 0.2,
      detail: 0.3,
    })
    const outOfRange = normalizeWallpaperAnalysis({
      luminance: 0.5,
      chroma: 1.01,
      detail: 0.3,
    })

    // Then
    expect(nonFinite).toEqual({
      analysis: BALANCED_SAFE_ANALYSIS,
      usedFallback: true,
    })
    expect(outOfRange).toEqual({
      analysis: BALANCED_SAFE_ANALYSIS,
      usedFallback: true,
    })
  })

  test("derives generative signals from preset descriptors", () => {
    // Given / When
    const moment = analyzeGenerativeWallpaper("moment")
    const muse = analyzeGenerativeWallpaper("muse")
    const flow = analyzeGenerativeWallpaper("flow")

    // Then
    expect(moment.analysis.luminance).toBeGreaterThan(muse.analysis.luminance)
    expect(flow.analysis.detail).toBeGreaterThan(moment.analysis.detail)
    for (const result of [moment, muse, flow]) {
      expect(result.usedFallback).toBe(false)
      expect(result.analysis.luminance).toBeWithin(0, 1)
      expect(result.analysis.chroma).toBeWithin(0, 1)
      expect(result.analysis.detail).toBeWithin(0, 1)
    }
  })

  test("defers static sampling, caps it at 64px, and caches by hash plus version", async () => {
    // Given
    let calls = 0
    const dimensions: number[] = []
    const analyzer = createStaticImageAnalyzer({
      sampleImage: async (_blob, maxDimension) => {
        calls += 1
        dimensions.push(maxDimension)
        return solidFrame(220)
      },
    })
    const asset = {
      contentHash: "sha256-fixture",
      blob: new Blob(["fixture"]),
    }

    // When
    const firstPromise = analyzer.analyze(asset)

    // Then
    expect(calls).toBe(0)
    const first = await firstPromise
    const second = await analyzer.analyze(asset)
    expect(first).toEqual(second)
    expect(calls).toBe(1)
    expect(dimensions).toEqual([64])
    expect(analyzer.cacheKey(asset.contentHash)).toBe(
      `${ANALYZER_VERSION}:${asset.contentHash}`,
    )
  })

  test("uses balanced-safe fallback when static decode fails", async () => {
    // Given
    const analyzer = createStaticImageAnalyzer({
      sampleImage: async () => {
        throw new Error("corrupt image")
      },
    })

    // When
    const result = await analyzer.analyze({
      contentHash: "corrupt",
      blob: new Blob(["corrupt"]),
    })

    // Then
    expect(result).toEqual({
      analysis: BALANCED_SAFE_ANALYSIS,
      usedFallback: true,
    })
  })

  test("hysteresis suppresses flip-flop under epsilon noise", () => {
    // Given
    const filter = createTemporalAnalysisFilter({
      smoothing: 0.4,
      hysteresis: 0.02,
    })
    const baseline = filter.update({ luminance: 0.5, chroma: 0.2, detail: 0.3 })

    // When
    const noisy = [0.51, 0.49, 0.512, 0.488].map((luminance) =>
      filter.update({ luminance, chroma: 0.2, detail: 0.3 }),
    )

    // Then
    expect(noisy).toEqual([baseline, baseline, baseline, baseline])
    expect(
      filter.update({ luminance: 0.9, chroma: 0.5, detail: 0.7 }).luminance,
    ).toBeGreaterThan(baseline.luminance)
  })

  test("samples video no faster than 1Hz and dispose cancels work", async () => {
    // Given
    const tasks = new Map<unknown, () => void>()
    const delays: number[] = []
    let handle = 0
    let samples = 0
    const published: WallpaperAnalysisResult[] = []
    const sampler = createVideoWallpaperSampler({
      sample: async () => {
        samples += 1
        return solidFrame(180)
      },
      onAnalysis: (analysis) => published.push(analysis),
      timer: {
        schedule: (task, delayMs) => {
          handle += 1
          delays.push(delayMs)
          tasks.set(handle, task)
          return handle
        },
        cancel: (timerHandle) => tasks.delete(timerHandle),
      },
    })

    // When
    sampler.start()
    const firstTask = tasks.get(1)
    tasks.delete(1)
    firstTask?.()
    await Promise.resolve()
    await Promise.resolve()

    // Then
    expect(samples).toBe(1)
    expect(published).toHaveLength(1)
    expect(delays).toEqual([0, 1000])
    sampler.dispose()
    expect(tasks.size).toBe(0)
  })

  test("publishes fallback when a video frame is unavailable", async () => {
    // Given
    const tasks = new Map<unknown, () => void>()
    const published: WallpaperAnalysisResult[] = []
    const sampler = createVideoWallpaperSampler({
      sample: async () => {
        throw new Error("video frame unavailable")
      },
      onAnalysis: (analysis) => published.push(analysis),
      timer: {
        schedule: (task) => {
          tasks.set(1, task)
          return 1
        },
        cancel: (timerHandle) => tasks.delete(timerHandle),
      },
    })

    // When
    sampler.start()
    const task = tasks.get(1)
    tasks.delete(1)
    task?.()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // Then
    expect(published).toEqual([
      { analysis: BALANCED_SAFE_ANALYSIS, usedFallback: true },
    ])
    sampler.dispose()
  })

  test("production analyzer contains no GPU readback", async () => {
    // Given
    const productionFiles = [
      "wallpaperAnalysis.ts",
      "wallpaperAnalysisCore.ts",
      "wallpaperImageAnalysis.ts",
      "wallpaperVideoAnalysis.ts",
      "wallpaperAnalyzer.ts",
    ]

    // When / Then
    for (const filename of productionFiles) {
      const source = await Bun.file(
        new URL(`./${filename}`, import.meta.url),
      ).text()
      expect(source.includes("read" + "Pixels")).toBe(false)
    }
  })
})
