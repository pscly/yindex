import { expect, test } from "@playwright/test"
import {
  isMateriallyMonotonic,
  nearestRankPercentile,
} from "./extension.perf-lifecycle.metrics"
import { createTask26Summary } from "./extension.perf-lifecycle.summary"
import type { HomeLifecycleProfile } from "./extension.perf-lifecycle.types"

const wallpaperDurationsMs = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
] as const

test("calculates nearest-rank percentiles deterministically", () => {
  // Given: unsorted frame durations and an empty unsupported sample set
  const unsorted = [4, 1, 3, 2]

  // When: nearest-rank p95 values are calculated without mutating the input
  const p95 = nearestRankPercentile(unsorted, 0.95)
  const unsupported = nearestRankPercentile([], 0.95)

  // Then: the 95th-percentile rank and unsupported result are exact
  expect(p95).toBe(4)
  expect(unsupported).toBeNull()
  expect(unsorted).toEqual([4, 1, 3, 2])
})

test("detects only sustained material growth as monotonic", () => {
  // Given: one steadily growing series and one series with a plateau
  const growing = [10, 11, 12]
  const stable = [10, 11, 11]

  // When: each series is evaluated at a one-unit material step
  const growingResult = isMateriallyMonotonic(growing, 1)
  const stableResult = isMateriallyMonotonic(stable, 1)

  // Then: only growth on every sample interval violates the lifecycle contract
  expect(growingResult).toBe(true)
  expect(stableResult).toBe(false)
})

test("reports a truthful nearest-rank Wallpaper JavaScript p95 budget", () => {
  // Given: a 10-second reference window whose nearest-rank p95 is above 4ms
  const home = {
    coldOpenMs: 100,
    cspViolations: [],
    heap: {
      dialogCycles: 25,
      domNodeSamples: [100, 100, 100, 100, 100, 100],
      domNodesMateriallyMonotonic: false,
      finalGrowthMiB: 1,
      listenerSamples: [10, 10, 10, 10, 10, 10],
      listenersMateriallyMonotonic: false,
      materiallyMonotonic: false,
      materialStepMiB: 1,
      peakGrowthMiB: 1,
      sampleEveryTurns: 20,
      samplesMiB: [10, 11, 10, 11, 10, 11],
      turns: 100,
    },
    hardware: {
      devicePixelRatio: 2,
      gpuRenderer: "test-gpu",
      refreshRateHz: 60,
      refreshRateSampleCount: 60,
      viewport: { height: 800, width: 1280 },
    },
    pageTurns: {
      forwardMedianMs: 1,
      forwardMs: [1],
      forwardTurnsWithLongFrames: 0,
      loafSupported: true,
      longAnimationFramesMs: [],
      reducedMedianMs: 1,
      reducedMotionMs: [1],
      reverseMedianMs: 1,
      reverseMs: [1],
      reverseTurnsWithLongFrames: 0,
    },
    rendererActivity: {
      activeCanvasCount: 1,
      activeWallpaperCount: 1,
      inactiveReducedMotionCount: 2,
      inactiveWallpaperCount: 2,
    },
    traces: { coldNewtab: 1 },
    wallpaperFrames: {
      hiddenRafGrowth: 0,
      hiddenTransitions: 0,
      hiddenWallpaperDrawGrowth: 0,
      inactiveTabTransitions: 2,
      inactiveTabWallpaperDrawGrowth: 0,
      inactiveWallpaperDrawGrowth: 0,
      idleRafGrowth: 0,
      visibleFrameGrowth: 1,
      visibleWallpaperDrawGrowth: 1,
    },
    wallpaperJs: {
      durationsMs: wallpaperDurationsMs,
      windowMs: 10_000,
    },
    warmOpenMs: 100,
  } satisfies HomeLifecycleProfile

  // When: the Task 26 summary evaluates its performance budgets
  const summary = createTask26Summary({
    home,
    restart: {
      browserUserAgent: "test-agent",
      browserVersion: "test-browser",
      reopenedPageId: "page_moment",
      restarted: true,
      restartedUrl: "chrome-extension://test/worker.js",
      stoppedTarget: true,
    },
    runId: "unit",
  })

  // Then: the over-budget p95 is preserved and fails rather than being forced green
  expect(summary).toMatchObject({
    budgets: {
      stressLifecycleGrowth: {
        dialogCycles: 25,
        pass: true,
        sampleCount: 6,
        sampleEveryTurns: 20,
        turns: 100,
      },
      wallpaperJsP95: {
        limitMs: 4,
        p95Ms: 19,
        pass: false,
        sampleCount: 20,
        windowMs: 10_000,
      },
    },
    hardware: {
      arch: expect.any(String),
      chromium: "test-browser",
      cpuModel: expect.any(String),
      cpus: expect.any(Number),
      devicePixelRatio: 2,
      gpuRenderer: "test-gpu",
      memGB: expect.any(Number),
      osName: expect.any(String),
      osRelease: expect.any(String),
      platform: expect.any(String),
      refreshRateHz: 60,
      userAgent: "test-agent",
      viewport: { height: 800, width: 1280 },
    },
    overallPass: false,
  })
})
