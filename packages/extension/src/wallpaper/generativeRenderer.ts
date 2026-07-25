import {
  createCanvas2DBackend,
  createDefaultBackend,
  createWebGL2Backend,
  resolveBackend,
} from "./generativeBackends"
import { getGenerativePresetDescriptor } from "./generativePresets"
import type {
  BackendKind,
  FrameBackend,
  FrameDrawInput,
  FrameScheduler,
  GenerativeCanvasPort,
  GenerativeRenderer,
  GenerativeRendererOptions,
} from "./generativeRendererTypes"
import { GenerativeRendererError } from "./generativeRendererTypes"

export const TARGET_FPS = 30
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS
const MAX_DEVICE_PIXEL_RATIO = 1.5
const DEVICE_PIXEL_RATIO_STEP = 0.25
const SLOW_FRAME_LIMIT = 4

export type {
  BackendKind,
  FrameBackend,
  FrameDrawInput,
  FrameScheduler,
  GenerativeCanvasPort,
  GenerativeRenderer,
  GenerativeRendererOptions,
}
export { GenerativeRendererError }
export { createDefaultBackend, createCanvas2DBackend, createWebGL2Backend }

const defaultScheduler: FrameScheduler = {
  schedule: (cb) => requestAnimationFrame((t) => cb(t)),
  cancel: (id) => cancelAnimationFrame(id),
}

export function createGenerativeRenderer(
  options: GenerativeRendererOptions,
): GenerativeRenderer {
  const scheduler = options.scheduler ?? defaultScheduler
  const now = options.now ?? (() => performance.now())
  const requestedFps = options.maxFps ?? TARGET_FPS
  const maxFps = Number.isFinite(requestedFps)
    ? Math.min(TARGET_FPS, Math.max(1, requestedFps))
    : TARGET_FPS
  const frameInterval = 1000 / maxFps
  const pixelRatio =
    options.pixelRatio ?? (() => globalThis.devicePixelRatio ?? 1)
  let preset = options.preset
  let active = options.active ?? true
  let reducedMotion = options.reducedMotion ?? false
  let disposed = false
  let started = false
  let scheduleId: number | null = null
  let lastDrawMs = Number.NEGATIVE_INFINITY
  let originMs = 0
  let width = Math.max(1, options.canvas.width || 1)
  let height = Math.max(1, options.canvas.height || 1)
  const initialRatio = pixelRatio()
  let renderRatio = Number.isFinite(initialRatio)
    ? Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, initialRatio))
    : 1
  let slowFrames = 0
  let backend = resolveBackend(
    options.canvas,
    options.createBackend,
    options.createCanvas,
  )
  let contextBackend: FrameBackend | null = null
  let detachContextLifecycle = (): void => {}

  const cancelLoop = (): void => {
    if (scheduleId !== null) {
      scheduler.cancel(scheduleId)
      scheduleId = null
    }
  }

  const resizeBackend = (target: FrameBackend): void => {
    target.resize(
      Math.max(1, Math.floor(width * renderRatio)),
      Math.max(1, Math.floor(height * renderRatio)),
    )
  }

  const frameInput = (
    staticFrame: boolean,
    timeMs: number,
  ): FrameDrawInput => ({
    preset,
    descriptor: getGenerativePresetDescriptor(preset),
    timeSeconds: staticFrame ? 0 : Math.max(0, (timeMs - originMs) / 1000),
    staticFrame,
  })

  const createCanvasFallback = (): FrameBackend =>
    options.createBackend
      ? options.createBackend("canvas2d")
      : createCanvas2DBackend(options.canvas, options.createCanvas)

  const paint = (staticFrame: boolean, timeMs: number): void => {
    if (disposed) return
    const input = frameInput(staticFrame, timeMs)
    const drawStartedMs = now()
    try {
      backend.draw(input)
    } catch (e) {
      if (!(e instanceof Error) || backend.kind !== "webgl2") throw e
      detachContextLifecycle()
      contextBackend = null
      backend.dispose()
      backend = createCanvasFallback()
      resizeBackend(backend)
      backend.draw(input)
    }
    const drawDurationMs = Math.max(0, now() - drawStartedMs)
    slowFrames = drawDurationMs > frameInterval ? slowFrames + 1 : 0
    if (slowFrames >= SLOW_FRAME_LIMIT && renderRatio > 1) {
      renderRatio = Math.max(1, renderRatio - DEVICE_PIXEL_RATIO_STEP)
      slowFrames = 0
      resizeBackend(backend)
    }
    lastDrawMs = timeMs
  }

  const tick = (timeMs: number): void => {
    scheduleId = null
    if (disposed || !started || !active || reducedMotion) return
    if (timeMs - lastDrawMs >= frameInterval - 0.5) paint(false, timeMs)
    if (!disposed && started && active && !reducedMotion) {
      scheduleId = scheduler.schedule(tick)
    }
  }

  const ensureLoop = (): void => {
    if (
      disposed ||
      !started ||
      !active ||
      reducedMotion ||
      scheduleId !== null
    ) {
      return
    }
    scheduleId = scheduler.schedule(tick)
  }

  const attachContextLifecycle = (target: FrameBackend): void => {
    if (!target.setContextLifecycle) return
    contextBackend = target
    detachContextLifecycle = target.setContextLifecycle({
      lost() {
        if (disposed || backend !== target) return
        cancelLoop()
        const fallback = createCanvasFallback()
        resizeBackend(fallback)
        fallback.draw(frameInput(true, now()))
        backend = fallback
      },
      restored() {
        if (disposed || contextBackend !== target) return
        if (backend !== target) backend.dispose()
        backend = target
        resizeBackend(backend)
        if (!started || !active) return
        const timeMs = now()
        paint(reducedMotion, timeMs)
        if (!reducedMotion) ensureLoop()
      },
    })
  }

  attachContextLifecycle(backend)

  const api: GenerativeRenderer = {
    start() {
      if (disposed || started) return
      started = true
      originMs = now()
      resizeBackend(backend)
      if (reducedMotion) {
        paint(true, originMs)
        return
      }
      if (active) {
        paint(false, originMs)
        ensureLoop()
      }
    },
    pause() {
      api.setActive(false)
    },
    resume() {
      api.setActive(true)
    },
    setActive(next) {
      if (disposed) return
      active = next
      if (!active) {
        cancelLoop()
        return
      }
      if (started && !reducedMotion) {
        const t = now()
        if (t - lastDrawMs >= frameInterval - 0.5) paint(false, t)
        ensureLoop()
      }
    },
    setReducedMotion(next) {
      if (disposed) return
      // Idempotent: repeated true/true or false/false must not repaint or re-arm.
      if (reducedMotion === next) return
      reducedMotion = next
      if (reducedMotion) {
        cancelLoop()
        if (started) paint(true, now())
        return
      }
      if (started && active) ensureLoop()
    },
    setPreset(next) {
      if (disposed) return
      preset = next
      if (started && (active || reducedMotion)) paint(reducedMotion, now())
    },
    resize(w, h) {
      if (disposed) return
      width = Math.max(1, Math.floor(w))
      height = Math.max(1, Math.floor(h))
      resizeBackend(backend)
      if (started && (active || reducedMotion)) paint(reducedMotion, now())
    },
    renderStaticFrame() {
      if (disposed) return
      resizeBackend(backend)
      paint(true, now())
    },
    getBackendKind: () => backend.kind,
    dispose() {
      if (disposed) return
      disposed = true
      started = false
      active = false
      cancelLoop()
      detachContextLifecycle()
      backend.dispose()
      if (contextBackend && contextBackend !== backend) contextBackend.dispose()
      contextBackend = null
    },
  }
  return api
}
