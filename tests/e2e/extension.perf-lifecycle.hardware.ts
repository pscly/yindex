import type { Page } from "@playwright/test"
import { median, round } from "./extension.perf-lifecycle.helpers"
import type { RuntimeHardwareProfile } from "./extension.perf-lifecycle.types"

const REFRESH_INTERVAL_SAMPLE_COUNT = 60
const REFRESH_SAMPLE_TIMEOUT_MS = 3_000

type BrowserHardwareProbe = {
  readonly devicePixelRatio: number
  readonly gpuRenderer: string
  readonly refreshIntervalsMs: readonly number[]
  readonly viewport: {
    readonly height: number
    readonly width: number
  }
}

export async function collectRuntimeHardware(
  page: Page,
): Promise<RuntimeHardwareProfile> {
  const probe = await page.evaluate<
    BrowserHardwareProbe,
    {
      readonly intervalCount: number
      readonly timeoutMs: number
    }
  >(
    ({ intervalCount, timeoutMs }) =>
      new Promise((resolveProbe) => {
        const canvas = document.createElement("canvas")
        const context =
          canvas.getContext("webgl2") ?? canvas.getContext("webgl")
        let gpuRenderer = "unknown"
        if (context !== null) {
          const debugInfo = context.getExtension("WEBGL_debug_renderer_info")
          const unmaskedRenderer: unknown =
            debugInfo === null
              ? null
              : context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          const ordinaryRenderer: unknown = context.getParameter(
            context.RENDERER,
          )
          if (typeof unmaskedRenderer === "string" && unmaskedRenderer !== "") {
            gpuRenderer = unmaskedRenderer
          } else if (
            typeof ordinaryRenderer === "string" &&
            ordinaryRenderer !== ""
          ) {
            gpuRenderer = ordinaryRenderer
          }
          context.getExtension("WEBGL_lose_context")?.loseContext()
        }
        canvas.remove()

        const refreshIntervalsMs: number[] = []
        let previousTimestamp: number | null = null
        let frameId = 0
        let settled = false
        const finish = (): void => {
          if (settled) return
          settled = true
          window.clearTimeout(timeoutId)
          window.cancelAnimationFrame(frameId)
          resolveProbe({
            devicePixelRatio: window.devicePixelRatio,
            gpuRenderer,
            refreshIntervalsMs,
            viewport: {
              height: window.innerHeight,
              width: window.innerWidth,
            },
          })
        }
        const sample = (timestamp: number): void => {
          if (previousTimestamp !== null) {
            refreshIntervalsMs.push(timestamp - previousTimestamp)
          }
          previousTimestamp = timestamp
          if (refreshIntervalsMs.length >= intervalCount) {
            finish()
            return
          }
          frameId = window.requestAnimationFrame(sample)
        }
        const timeoutId = window.setTimeout(finish, timeoutMs)
        frameId = window.requestAnimationFrame(sample)
      }),
    {
      intervalCount: REFRESH_INTERVAL_SAMPLE_COUNT,
      timeoutMs: REFRESH_SAMPLE_TIMEOUT_MS,
    },
  )
  const pageViewport = page.viewportSize()
  const viewport =
    probe.viewport.width > 0 && probe.viewport.height > 0
      ? probe.viewport
      : (pageViewport ?? probe.viewport)
  const refreshIntervalMedianMs =
    probe.refreshIntervalsMs.length === REFRESH_INTERVAL_SAMPLE_COUNT
      ? median(probe.refreshIntervalsMs)
      : 0
  return {
    devicePixelRatio: probe.devicePixelRatio,
    gpuRenderer: probe.gpuRenderer,
    refreshRateHz:
      refreshIntervalMedianMs > 0
        ? round(1_000 / refreshIntervalMedianMs)
        : "unknown",
    refreshRateSampleCount: probe.refreshIntervalsMs.length,
    viewport,
  }
}
