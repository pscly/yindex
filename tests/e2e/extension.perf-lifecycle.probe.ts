import type { Page } from "@playwright/test"
import { round } from "./extension.perf-lifecycle.helpers"

const TURN_INPUT_PACING_MS = 200

export type FrameProbe = {
  activeWallpaperDraws: number
  hiddenRafCallbacks: number
  hiddenTransitions: number
  hiddenWallpaperDraws: number
  inactiveTabWallpaperDraws: number
  inactiveWallpaperDraws: number
  loafSupported: boolean
  longAnimationFrames: Array<{
    readonly duration: number
    readonly startTime: number
  }>
  rafCallbacks: number
}

export type TurnBatch = {
  readonly durationsMs: readonly number[]
  readonly turnsWithLongFrames: number
}

type TurnProbe = {
  endedAt: number | null
  error: string | null
  responseMs: number | null
  settled: boolean
  startedAt: number | null
}

declare global {
  interface Window {
    __yindexTask26FrameProbe: FrameProbe
    __yindexTask26TurnProbe: TurnProbe
  }
}

class PageTurnProbeError extends Error {
  override readonly name = "PageTurnProbeError"
}

export async function installFrameProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: FrameProbe = {
      activeWallpaperDraws: 0,
      hiddenRafCallbacks: 0,
      hiddenTransitions: 0,
      hiddenWallpaperDraws: 0,
      inactiveTabWallpaperDraws: 0,
      inactiveWallpaperDraws: 0,
      loafSupported: false,
      longAnimationFrames: [],
      rafCallbacks: 0,
    }
    window.__yindexTask26FrameProbe = probe
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      requestFrame((timestamp) => {
        probe.rafCallbacks += 1
        if (document.visibilityState === "hidden") {
          probe.hiddenRafCallbacks += 1
        }
        callback(timestamp)
      })
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") probe.hiddenTransitions += 1
    })
    const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage
    function trackedDrawImage(
      this: CanvasRenderingContext2D,
      ...args:
        | [CanvasImageSource, number, number]
        | [CanvasImageSource, number, number, number, number]
        | [
            CanvasImageSource,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ]
    ): void {
      const stage = this.canvas.closest<HTMLElement>("[data-wallpaper-active]")
      if (stage?.getAttribute("data-wallpaper-active") === "true") {
        probe.activeWallpaperDraws += 1
      } else if (stage !== null) {
        probe.inactiveWallpaperDraws += 1
      }
      if (stage !== null && document.visibilityState === "hidden") {
        probe.hiddenWallpaperDraws += 1
      }
      if (
        document
          .querySelector("[data-home-tab-active]")
          ?.getAttribute("data-home-tab-active") === "false"
      ) {
        probe.inactiveTabWallpaperDraws += 1
      }
      Reflect.apply(nativeDrawImage, this, args)
    }
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: trackedDrawImage,
      writable: true,
    })
    probe.loafSupported = PerformanceObserver.supportedEntryTypes.includes(
      "long-animation-frame",
    )
    if (!probe.loafSupported) return
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          probe.longAnimationFrames.push({
            duration: Math.round(entry.duration * 1000) / 1000,
            startTime: entry.startTime,
          })
        }
      }
    })
    observer.observe({ type: "long-animation-frame", buffered: true })
  })
}

export async function readFrameProbe(page: Page): Promise<FrameProbe> {
  return page.evaluate(() => ({ ...window.__yindexTask26FrameProbe }))
}

export async function measureTurns(
  page: Page,
  key: "PageDown" | "PageUp",
  count: number,
): Promise<TurnBatch> {
  const samples: number[] = []
  let turnsWithLongFrames = 0
  for (let index = 0; index < count; index += 1) {
    await page.evaluate(() => {
      const probe: TurnProbe = {
        endedAt: null,
        error: null,
        responseMs: null,
        settled: false,
        startedAt: null,
      }
      window.__yindexTask26TurnProbe = probe
      const activePage = document.querySelector(
        '[data-page-slot-active="true"] [data-page-id]',
      )
      const initial = activePage?.getAttribute("data-page-id")
      const stage = activePage?.closest(
        "[data-page-slot-active]",
      )?.parentElement
      const initialStageStyle = stage?.getAttribute("style")
      let keyStartedAt: number | null = null
      const visualObserver = new MutationObserver(() => {
        if (
          keyStartedAt !== null &&
          stage?.getAttribute("style") !== initialStageStyle
        ) {
          probe.responseMs = performance.now() - keyStartedAt
          visualObserver.disconnect()
        }
      })
      const settleObserver = new MutationObserver(() => {
        const current = document
          .querySelector('[data-page-slot-active="true"] [data-page-id]')
          ?.getAttribute("data-page-id")
        if (keyStartedAt === null || current === initial) return
        window.clearTimeout(timeout)
        visualObserver.disconnect()
        settleObserver.disconnect()
        probe.endedAt = performance.now()
        probe.settled = true
      })
      const timeout = window.setTimeout(() => {
        visualObserver.disconnect()
        settleObserver.disconnect()
        probe.error = "Page Turn did not activate the next Page"
      }, 5_000)
      document.addEventListener(
        "keydown",
        () => {
          keyStartedAt = performance.now()
          probe.startedAt = keyStartedAt
        },
        { capture: true, once: true },
      )
      if (stage === undefined || stage === null) {
        window.clearTimeout(timeout)
        probe.error = "Page Turn stage is missing"
        return
      }
      visualObserver.observe(stage, {
        attributeFilter: ["style"],
        attributes: true,
      })
      settleObserver.observe(document.body, {
        attributeFilter: ["data-page-slot-active"],
        attributes: true,
        subtree: true,
      })
    })
    await page.keyboard.press(key)
    await page.waitForFunction(
      () =>
        window.__yindexTask26TurnProbe.settled ||
        window.__yindexTask26TurnProbe.error !== null,
      undefined,
      { timeout: 5_500 },
    )
    const outcome = await page.evaluate(() => ({
      ...window.__yindexTask26TurnProbe,
    }))
    if (outcome.error !== null || outcome.responseMs === null) {
      throw new PageTurnProbeError(
        outcome.error ?? "Page Turn probe ended without a result",
      )
    }
    samples.push(round(outcome.responseMs))
    await page.waitForTimeout(TURN_INPUT_PACING_MS)
    const after = await readFrameProbe(page)
    const responseEnd =
      outcome.startedAt !== null && outcome.responseMs !== null
        ? outcome.startedAt + outcome.responseMs + 16
        : null
    const correlatedLongFrame = after.longAnimationFrames.some((frame) => {
      if (outcome.startedAt === null || responseEnd === null) return false
      return (
        frame.startTime >= outcome.startedAt && frame.startTime <= responseEnd
      )
    })
    if (correlatedLongFrame) {
      turnsWithLongFrames += 1
    }
  }
  return { durationsMs: samples, turnsWithLongFrames }
}
