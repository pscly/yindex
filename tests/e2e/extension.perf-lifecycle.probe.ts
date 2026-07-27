import type { Page } from "@playwright/test"

export type FrameProbe = {
  readonly activeWallpaperDraws: number
  readonly hiddenRafCallbacks: number
  readonly hiddenTransitions: number
  readonly hiddenWallpaperDraws: number
  readonly inactiveTabWallpaperDraws: number
  readonly inactiveWallpaperDraws: number
  readonly loafSupported: boolean
  readonly longAnimationFrames: readonly {
    readonly duration: number
    readonly startTime: number
  }[]
  readonly rafCallbacks: number
  readonly wallpaperJsDurationsMs: readonly number[]
  readonly wallpaperJsRecording: boolean
}

type MutableFrameProbe = {
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
  wallpaperJsDurationsMs: number[]
  wallpaperJsRecording: boolean
}

declare global {
  interface Window {
    __yindexTask26FrameProbe: MutableFrameProbe
  }
}

export async function installFrameProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: MutableFrameProbe = {
      activeWallpaperDraws: 0,
      hiddenRafCallbacks: 0,
      hiddenTransitions: 0,
      hiddenWallpaperDraws: 0,
      inactiveTabWallpaperDraws: 0,
      inactiveWallpaperDraws: 0,
      loafSupported: false,
      longAnimationFrames: [],
      rafCallbacks: 0,
      wallpaperJsDurationsMs: [],
      wallpaperJsRecording: false,
    }
    window.__yindexTask26FrameProbe = probe
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      requestFrame((timestamp) => {
        probe.rafCallbacks += 1
        if (document.visibilityState === "hidden") {
          probe.hiddenRafCallbacks += 1
        }
        if (!probe.wallpaperJsRecording) {
          callback(timestamp)
          return
        }
        const activeDrawsBefore = probe.activeWallpaperDraws
        const callbackStartedAt = performance.now()
        try {
          callback(timestamp)
        } finally {
          if (probe.activeWallpaperDraws > activeDrawsBefore) {
            probe.wallpaperJsDurationsMs.push(
              performance.now() - callbackStartedAt,
            )
          }
        }
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

export async function measureWallpaperJs(
  page: Page,
  windowMs: number,
): Promise<readonly number[]> {
  return page.evaluate(
    (durationMs) =>
      new Promise<readonly number[]>((resolveDurations) => {
        const probe = window.__yindexTask26FrameProbe
        probe.wallpaperJsDurationsMs = []
        probe.wallpaperJsRecording = true
        window.setTimeout(() => {
          probe.wallpaperJsRecording = false
          resolveDurations([...probe.wallpaperJsDurationsMs])
        }, durationMs)
      }),
    windowMs,
  )
}
