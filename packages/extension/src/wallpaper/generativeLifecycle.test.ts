import { describe, expect, test } from "bun:test"
import type { GenerativeCanvas2D } from "./generativeCanvasPort"
import {
  FRAME_INTERVAL_MS,
  type FrameBackend,
  type FrameScheduler,
  type GenerativeCanvasPort,
  createDefaultBackend,
  createGenerativeRenderer,
} from "./generativeRenderer"

class TestCanvas implements GenerativeCanvasPort {
  width: number
  height: number
  readonly contexts: string[] = []

  constructor(context2d: GenerativeCanvas2D | null, width = 0, height = 0) {
    this.context2d = context2d
    this.width = width
    this.height = height
  }

  private readonly context2d: GenerativeCanvas2D | null

  getContext(contextId: "2d", options?: unknown): GenerativeCanvas2D | null
  getContext(
    contextId: "webgl2",
    options?: unknown,
  ): WebGL2RenderingContext | null
  getContext(
    contextId: string,
    options?: unknown,
  ): GenerativeCanvas2D | WebGL2RenderingContext | null
  getContext(
    contextId: string,
    options?: unknown,
  ): GenerativeCanvas2D | WebGL2RenderingContext | null {
    this.contexts.push(contextId)
    void options
    return contextId === "2d" ? this.context2d : null
  }
}

function fakeScheduler(): {
  readonly scheduler: FrameScheduler
  flush(nowMs: number): void
  pendingCount(): number
} {
  let id = 0
  const pending = new Map<number, (nowMs: number) => void>()
  return {
    scheduler: {
      schedule(callback) {
        id += 1
        pending.set(id, callback)
        return id
      },
      cancel(frameId) {
        pending.delete(frameId)
      },
    },
    flush(nowMs) {
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) callback(nowMs)
    },
    pendingCount: () => pending.size,
  }
}

function canvas(width = 100, height = 50): GenerativeCanvasPort {
  return {
    width,
    height,
    getContext: () => null,
  }
}

function recordingBackend(onDraw: () => void = () => {}): {
  readonly backend: FrameBackend
  readonly draws: boolean[]
  readonly resizes: Array<readonly [number, number]>
} {
  const draws: boolean[] = []
  const resizes: Array<readonly [number, number]> = []
  return {
    backend: {
      kind: "canvas2d",
      resize(width, height) {
        resizes.push([width, height])
      },
      draw(input) {
        draws.push(input.staticFrame)
        onDraw()
      },
      dispose() {},
    },
    draws,
    resizes,
  }
}

describe("generative production lifecycle", () => {
  test("caps an oversized maxFps request at 30fps", () => {
    // Given
    const fake = fakeScheduler()
    const recording = recordingBackend()
    const renderer = createGenerativeRenderer({
      canvas: canvas(),
      preset: "moment",
      maxFps: 120,
      scheduler: fake.scheduler,
      now: () => 0,
      createBackend: () => recording.backend,
    })

    // When
    renderer.start()
    for (let timeMs = 1; timeMs <= 100; timeMs += 1) fake.flush(timeMs)

    // Then
    expect(recording.draws).toHaveLength(4)
    renderer.dispose()
  })

  test("Strict Mode cleanup before remount leaves exactly one loop", () => {
    // Given
    const fake = fakeScheduler()
    const first = createGenerativeRenderer({
      canvas: canvas(),
      preset: "moment",
      scheduler: fake.scheduler,
      now: () => 0,
      createBackend: () => recordingBackend().backend,
    })
    first.start()

    // When
    first.dispose()
    const second = createGenerativeRenderer({
      canvas: canvas(),
      preset: "moment",
      scheduler: fake.scheduler,
      now: () => 0,
      createBackend: () => recordingBackend().backend,
    })
    second.start()

    // Then
    expect(fake.pendingCount()).toBe(1)
    fake.flush(FRAME_INTERVAL_MS)
    expect(fake.pendingCount()).toBe(1)
    second.dispose()
    expect(fake.pendingCount()).toBe(0)
  })

  test("context loss freezes on a static frame and restore resumes one loop", () => {
    // Given
    const fake = fakeScheduler()
    const draws: boolean[] = []
    let lose: (() => void) | undefined
    let restore: (() => void) | undefined
    const backend: FrameBackend = {
      kind: "webgl2" as const,
      resize() {},
      draw(input) {
        draws.push(input.staticFrame)
      },
      setContextLifecycle(listeners: {
        readonly lost: () => void
        readonly restored: () => void
      }) {
        lose = listeners.lost
        restore = listeners.restored
        return () => {
          lose = undefined
          restore = undefined
        }
      },
      dispose() {},
    }
    const renderer = createGenerativeRenderer({
      canvas: canvas(),
      preset: "flow",
      scheduler: fake.scheduler,
      now: () => 0,
      createBackend: () => backend,
    })
    renderer.start()

    // When
    lose?.()
    for (let frame = 1; frame <= 5; frame += 1) {
      fake.flush(frame * FRAME_INTERVAL_MS)
    }

    // Then
    expect(draws).toEqual([false, true])
    expect(fake.pendingCount()).toBe(0)

    // When restored resources become available
    restore?.()

    // Then animation resumes with exactly one loop
    expect(fake.pendingCount()).toBe(1)
    fake.flush(FRAME_INTERVAL_MS * 7)
    expect(draws.at(-1)).toBe(false)
    expect(fake.pendingCount()).toBe(1)
    renderer.dispose()
  })

  test("caps DPR at 1.5 and steps down after sustained slow draws", () => {
    // Given
    const fake = fakeScheduler()
    let wallMs = 0
    const recording = recordingBackend(() => {
      wallMs += 40
    })
    const renderer = createGenerativeRenderer({
      canvas: canvas(),
      preset: "muse",
      scheduler: fake.scheduler,
      now: () => wallMs,
      pixelRatio: () => 3,
      createBackend: () => recording.backend,
    })

    // When
    renderer.start()
    for (let frame = 1; frame <= 4; frame += 1) {
      fake.flush(frame * FRAME_INTERVAL_MS)
    }

    // Then
    expect(recording.resizes[0]).toEqual([150, 75])
    expect(recording.resizes).toContainEqual([125, 62])
    renderer.dispose()
  })

  test("WebGL and fallback Canvas2D request different fresh surfaces", () => {
    // Given
    const surfaces: TestCanvas[] = []
    const visibleContext = {
      fillStyle: "",
      fillRect() {},
      createRadialGradient: () => ({ addColorStop() {} }),
      drawImage() {},
    }
    const visible = new TestCanvas(visibleContext, 20, 10)
    const createSurface = () => {
      const surface = new TestCanvas(visibleContext)
      surfaces.push(surface)
      return {
        canvas: surface,
        compositeTo() {},
        listenForContextChange() {
          return () => {}
        },
      }
    }

    // When WebGL initialization fails and Canvas2D takes over
    const backend = createDefaultBackend(visible, "webgl2", createSurface)

    // Then each backend attempted its own new surface
    expect(backend.kind).toBe("canvas2d")
    expect(surfaces).toHaveLength(2)
    expect(surfaces[0]).not.toBe(surfaces[1])
    expect(surfaces.map((surface) => surface.contexts)).toEqual([
      ["webgl2"],
      ["2d"],
    ])
    backend.dispose()
  })
})
