import {
  IDLE_WINDOW_MS,
  hardwareMetadata,
} from "./extension.perf-lifecycle.helpers"
import {
  WALLPAPER_JS_WINDOW_MS,
  nearestRankPercentile,
} from "./extension.perf-lifecycle.metrics"
import type { ServiceWorkerRestartProfile } from "./extension.perf-lifecycle.restart"
import type { HomeLifecycleProfile } from "./extension.perf-lifecycle.types"

const NEWTAB_COLD_BUDGET_MS = 3_000
const NEWTAB_WARM_BUDGET_MS = 5_000
const PAGE_TURN_MEDIAN_BUDGET_MS = 300
const HEAP_GROWTH_BUDGET_MIB = 80
const WALLPAPER_JS_P95_BUDGET_MS = 4

export function createTask26Summary(input: {
  readonly home: HomeLifecycleProfile
  readonly restart: ServiceWorkerRestartProfile
  readonly runId: string
}) {
  const { home, restart } = input
  const activity = home.rendererActivity
  const totalTurnsWithLongFrames =
    home.pageTurns.forwardTurnsWithLongFrames +
    home.pageTurns.reverseTurnsWithLongFrames
  const longFramesEveryTurn = totalTurnsWithLongFrames === 60
  const wallpaperJsP95Ms = nearestRankPercentile(
    home.wallpaperJs.durationsMs,
    0.95,
  )
  const budgets = {
    activeRenderersAfterSettle: {
      actual: activity.activeCanvasCount,
      limit: 1,
      pass:
        activity.activeCanvasCount === 1 &&
        activity.activeWallpaperCount === 1 &&
        activity.inactiveWallpaperCount > 0 &&
        activity.inactiveReducedMotionCount ===
          activity.inactiveWallpaperCount &&
        home.wallpaperFrames.inactiveWallpaperDrawGrowth === 0,
    },
    cdpTraceCapture: {
      actualEventCounts: home.traces,
      pass: Object.values(home.traces).every((eventCount) => eventCount > 0),
      thresholdMinimumEvents: 1,
    },
    coldNewtabMs: {
      actual: home.coldOpenMs,
      limit: NEWTAB_COLD_BUDGET_MS,
      pass: home.coldOpenMs <= NEWTAB_COLD_BUDGET_MS,
    },
    cspViolations: {
      actual: home.cspViolations.length,
      limit: 0,
      pass: home.cspViolations.length === 0,
    },
    idleHiddenRecurringFrames: {
      actual: home.wallpaperFrames.inactiveTabWallpaperDrawGrowth,
      limit: 0,
      pass:
        home.wallpaperFrames.inactiveTabWallpaperDrawGrowth === 0 &&
        home.wallpaperFrames.inactiveTabTransitions === 2,
    },
    longAnimationFramesEveryTurn: {
      actual: home.pageTurns.loafSupported ? longFramesEveryTurn : null,
      limit: false,
      pass: home.pageTurns.loafSupported ? !longFramesEveryTurn : true,
    },
    reducedMotionTurns: {
      actualMedianMs: home.pageTurns.reducedMedianMs,
      pass: home.pageTurns.reducedMedianMs <= PAGE_TURN_MEDIAN_BUDGET_MS,
      thresholdMs: PAGE_TURN_MEDIAN_BUDGET_MS,
    },
    swRestartReopen: {
      actual: restart.restarted && restart.reopenedPageId !== "missing",
      limit: true,
      pass: restart.restarted && restart.reopenedPageId !== "missing",
    },
    stressMemoryGrowthMB: {
      actual: home.heap.peakGrowthMiB,
      limit: HEAP_GROWTH_BUDGET_MIB,
      materiallyMonotonic: home.heap.materiallyMonotonic,
      pass:
        home.heap.peakGrowthMiB <= HEAP_GROWTH_BUDGET_MIB &&
        !home.heap.materiallyMonotonic,
    },
    stressLifecycleGrowth: {
      dialogCycles: home.heap.dialogCycles,
      domNodesMateriallyMonotonic: home.heap.domNodesMateriallyMonotonic,
      heapMateriallyMonotonic: home.heap.materiallyMonotonic,
      listenersMateriallyMonotonic: home.heap.listenersMateriallyMonotonic,
      sampleCount: home.heap.samplesMiB.length,
      sampleEveryTurns: home.heap.sampleEveryTurns,
      pass:
        home.heap.turns === 100 &&
        home.heap.dialogCycles === 25 &&
        home.heap.sampleEveryTurns === 20 &&
        home.heap.samplesMiB.length === 6 &&
        home.heap.domNodeSamples.length === home.heap.samplesMiB.length &&
        home.heap.listenerSamples.length === home.heap.samplesMiB.length &&
        !home.heap.materiallyMonotonic &&
        !home.heap.domNodesMateriallyMonotonic &&
        !home.heap.listenersMateriallyMonotonic,
      turns: home.heap.turns,
    },
    visibleWallpaperFrames: {
      actualRafGrowth: home.wallpaperFrames.visibleFrameGrowth,
      pass: home.wallpaperFrames.visibleFrameGrowth > 0,
      thresholdMinimum: 1,
    },
    wallpaperJsP95: {
      limitMs: WALLPAPER_JS_P95_BUDGET_MS,
      p95Ms: wallpaperJsP95Ms,
      pass:
        wallpaperJsP95Ms !== null &&
        wallpaperJsP95Ms < WALLPAPER_JS_P95_BUDGET_MS &&
        home.wallpaperJs.windowMs === WALLPAPER_JS_WINDOW_MS,
      sampleCount: home.wallpaperJs.durationsMs.length,
      windowMs: home.wallpaperJs.windowMs,
    },
    warmNewtabOpen: {
      actualMs: home.warmOpenMs,
      pass: home.warmOpenMs <= NEWTAB_WARM_BUDGET_MS,
      thresholdMs: NEWTAB_WARM_BUDGET_MS,
    },
    warmPageTurnMedianMs: {
      actual: Math.max(
        home.pageTurns.forwardMedianMs,
        home.pageTurns.reverseMedianMs,
      ),
      limit: PAGE_TURN_MEDIAN_BUDGET_MS,
      pass:
        home.pageTurns.forwardMedianMs <= PAGE_TURN_MEDIAN_BUDGET_MS &&
        home.pageTurns.reverseMedianMs <= PAGE_TURN_MEDIAN_BUDGET_MS,
    },
  }
  return {
    budgets,
    generatedAt: new Date().toISOString(),
    hardware: hardwareMetadata(
      restart.browserVersion,
      restart.browserUserAgent,
      home.hardware,
    ),
    idleWindowMs: IDLE_WINDOW_MS,
    measurements: {
      cspViolations: home.cspViolations,
      heap: home.heap,
      pageTurns: home.pageTurns,
      rendererActivity: home.rendererActivity,
      serviceWorker: {
        reopenedPageId: restart.reopenedPageId,
        restartedUrl: restart.restartedUrl,
        stoppedTarget: restart.stoppedTarget,
      },
      traces: home.traces,
      wallpaperFrames: home.wallpaperFrames,
      wallpaperJs: home.wallpaperJs,
    },
    overallPass: Object.values(budgets).every((budget) => budget.pass),
    runId: input.runId,
    schemaVersion: 1,
    task: 26,
  }
}
