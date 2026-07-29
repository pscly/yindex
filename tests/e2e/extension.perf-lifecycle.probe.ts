import type { Page } from "@playwright/test"

export type FrameProbe = {
  readonly activeWallpaperCanvas2dDraws: number
  readonly activeWallpaperDraws: number
  readonly activeWallpaperWebglDraws: number
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
  activeWallpaperCanvas2dDraws: number
  activeWallpaperDraws: number
  activeWallpaperWebglDraws: number
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

type DrawChannel = "canvas2d" | "image" | "webgl2"

declare global {
  interface Window {
    __yindexTask26FrameProbe: MutableFrameProbe
  }
}

export async function installFrameProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: MutableFrameProbe = {
      activeWallpaperCanvas2dDraws: 0,
      activeWallpaperDraws: 0,
      activeWallpaperWebglDraws: 0,
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
    const attributeWallpaperDraw = (
      canvas: unknown,
      channel: DrawChannel,
    ): void => {
      if (
        typeof HTMLCanvasElement === "undefined" ||
        !(canvas instanceof HTMLCanvasElement)
      ) {
        return
      }
      const stage = canvas.closest<HTMLElement>("[data-wallpaper-active]")
      if (stage?.getAttribute("data-wallpaper-active") === "true") {
        probe.activeWallpaperDraws += 1
        if (channel === "webgl2") probe.activeWallpaperWebglDraws += 1
        if (channel === "canvas2d") probe.activeWallpaperCanvas2dDraws += 1
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
    }
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
    if (typeof CanvasRenderingContext2D !== "undefined") {
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
        attributeWallpaperDraw(this.canvas, "image")
        Reflect.apply(nativeDrawImage, this, args)
      }
      Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
        configurable: true,
        value: trackedDrawImage,
        writable: true,
      })
      const nativeFillRect = CanvasRenderingContext2D.prototype.fillRect
      function trackedFillRect(
        this: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
      ): void {
        attributeWallpaperDraw(this.canvas, "canvas2d")
        Reflect.apply(nativeFillRect, this, [x, y, width, height])
      }
      Object.defineProperty(CanvasRenderingContext2D.prototype, "fillRect", {
        configurable: true,
        value: trackedFillRect,
        writable: true,
      })
    }
    if (typeof WebGL2RenderingContext !== "undefined") {
      const nativeDrawArrays = WebGL2RenderingContext.prototype.drawArrays
      function trackedDrawArrays(
        this: WebGL2RenderingContext,
        mode: number,
        first: number,
        count: number,
      ): void {
        attributeWallpaperDraw(this.canvas, "webgl2")
        Reflect.apply(nativeDrawArrays, this, [mode, first, count])
      }
      Object.defineProperty(WebGL2RenderingContext.prototype, "drawArrays", {
        configurable: true,
        value: trackedDrawArrays,
        writable: true,
      })
      const nativeDrawElements = WebGL2RenderingContext.prototype.drawElements
      function trackedDrawElements(
        this: WebGL2RenderingContext,
        mode: number,
        count: number,
        type: number,
        offset: number,
      ): void {
        attributeWallpaperDraw(this.canvas, "webgl2")
        Reflect.apply(nativeDrawElements, this, [mode, count, type, offset])
      }
      Object.defineProperty(WebGL2RenderingContext.prototype, "drawElements", {
        configurable: true,
        value: trackedDrawElements,
        writable: true,
      })
    }
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
