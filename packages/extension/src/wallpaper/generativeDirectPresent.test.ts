import { describe, expect, test } from "bun:test"
import {
  FRAME_INTERVAL_MS,
  type FrameBackend,
  createGenerativeRenderer,
} from "./generativeRenderer"
import {
  type Fake2DContext,
  FakeGLContext,
  FakeSurfaceCanvas,
  createFakeScheduler,
  fakeDirectGLSurface,
  stubCanvas,
} from "./generativeRendererTestSupport"

function legacyDetachedSurface(canvas: FakeSurfaceCanvas): {
  readonly canvas: FakeSurfaceCanvas
  compositeTo(target: Fake2DContext, width: number, height: number): void
  listenForContextChange(): () => void
} {
  return {
    canvas,
    compositeTo(target, width, height) {
      target.drawImage(canvas, 0, 0, width, height)
    },
    listenForContextChange() {
      return () => {}
    },
  }
}

function totalDrawImageCalls(surfaces: readonly FakeSurfaceCanvas[]): number {
  return surfaces.reduce(
    (total, surface) => total + surface.twoD.drawImageCalls,
    0,
  )
}

describe("generative direct presentation", () => {
  test("an animated WebGL frame presents without any synchronous GL-to-2D readback", () => {
    // Given visible stacked surfaces where every 2D context records composites
    const loseContextCalls = { value: 0 }
    const gl = new FakeGLContext(loseContextCalls)
    const glCanvas = new FakeSurfaceCanvas({ gl })
    const fallbackCanvas = new FakeSurfaceCanvas()
    const legacyDetached: FakeSurfaceCanvas[] = []
    const fake = createFakeScheduler()
    const clock = { nowMs: 0 }
    const options = {
      canvas: glCanvas,
      preset: "moment" as const,
      scheduler: fake.scheduler,
      now: () => clock.nowMs,
      surfaces: {
        gl: fakeDirectGLSurface(glCanvas),
        canvas2d: fallbackCanvas,
      },
      createCanvas: () => {
        const detached = new FakeSurfaceCanvas({
          gl: new FakeGLContext(loseContextCalls),
        })
        legacyDetached.push(detached)
        return legacyDetachedSurface(detached)
      },
    }
    const renderer = createGenerativeRenderer(options)

    // When the renderer starts and animated frames tick
    renderer.start()
    clock.nowMs = FRAME_INTERVAL_MS
    fake.flush(clock.nowMs)

    // Then the visible GL surface presents frames with zero 2D readback anywhere
    expect(gl.drawArraysCalls).toBeGreaterThan(0)
    expect(
      totalDrawImageCalls([glCanvas, fallbackCanvas, ...legacyDetached]),
    ).toBe(0)
    renderer.dispose()
  })

  test("the Canvas2D fallback paints directly on its own visible surface without a detached composite", () => {
    // Given a GL surface whose webgl2 request fails, forcing Canvas2D fallback
    const loseContextCalls = { value: 0 }
    const glCanvas = new FakeSurfaceCanvas({ gl: null })
    const fallbackCanvas = new FakeSurfaceCanvas()
    const legacyDetached: FakeSurfaceCanvas[] = []
    const fake = createFakeScheduler()
    const clock = { nowMs: 0 }
    const options = {
      canvas: glCanvas,
      preset: "muse" as const,
      reducedMotion: true,
      scheduler: fake.scheduler,
      now: () => clock.nowMs,
      surfaces: {
        gl: fakeDirectGLSurface(glCanvas),
        canvas2d: fallbackCanvas,
      },
      createCanvas: () => {
        const detached = new FakeSurfaceCanvas({ gl: null })
        legacyDetached.push(detached)
        return legacyDetachedSurface(detached)
      },
    }
    const renderer = createGenerativeRenderer(options)

    // When the single static fallback frame is painted
    renderer.start()

    // Then the fallback filled its dedicated canvas and never composited
    expect(renderer.getBackendKind()).toBe("canvas2d")
    expect(fallbackCanvas.twoD.fillRectCalls).toBeGreaterThan(0)
    expect(
      totalDrawImageCalls([glCanvas, fallbackCanvas, ...legacyDetached]),
    ).toBe(0)
    renderer.dispose()
  })

  test("dispose keeps the component-owned GL context reusable across a Strict Mode remount", () => {
    // Given one renderer disposed the way React Strict Mode cleanup does
    const loseContextCalls = { value: 0 }
    const gl = new FakeGLContext(loseContextCalls)
    const glCanvas = new FakeSurfaceCanvas({ gl })
    const fallbackCanvas = new FakeSurfaceCanvas()
    const fake = createFakeScheduler()
    const clock = { nowMs: 0 }
    const options = {
      canvas: glCanvas,
      preset: "flow" as const,
      scheduler: fake.scheduler,
      now: () => clock.nowMs,
      surfaces: {
        gl: fakeDirectGLSurface(glCanvas),
        canvas2d: fallbackCanvas,
      },
      createCanvas: () =>
        legacyDetachedSurface(
          new FakeSurfaceCanvas({
            gl: new FakeGLContext(loseContextCalls),
          }),
        ),
    }
    const first = createGenerativeRenderer(options)
    first.start()

    // When cleanup disposes it and the remount starts a fresh renderer on the same surfaces
    first.dispose()
    const second = createGenerativeRenderer(options)
    second.start()
    clock.nowMs = FRAME_INTERVAL_MS
    fake.flush(clock.nowMs)

    // Then no context was force-lost and the same GL surface keeps presenting
    expect(loseContextCalls.value).toBe(0)
    expect(second.getBackendKind()).toBe("webgl2")
    expect(gl.drawArraysCalls).toBeGreaterThan(0)
    second.dispose()
    expect(loseContextCalls.value).toBe(0)
  })

  test("a draw-time GL failure reveals the Canvas2D surface only after the fallback frame was drawn", () => {
    // Given a GL backend that fails during draw and a recording fallback
    const events: string[] = []
    const fake = createFakeScheduler()
    const clock = { nowMs: 0 }
    const renderer = createGenerativeRenderer({
      canvas: stubCanvas(),
      preset: "moment",
      scheduler: fake.scheduler,
      now: () => clock.nowMs,
      createBackend: (prefer) => {
        if (prefer === "webgl2") {
          return {
            kind: "webgl2",
            resize() {},
            draw() {
              events.push("gl-draw")
              throw new Error("context bind failed")
            },
            dispose() {},
          }
        }
        return {
          kind: "canvas2d",
          resize() {},
          draw() {
            events.push("fallback-draw")
          },
          dispose() {},
        }
      },
      onBackendChange: (kind) => events.push(`reveal:${kind}`),
    })

    // When the first paint hits the GL draw failure
    renderer.start()

    // Then the fallback surface was revealed only after its frame landed
    expect(renderer.getBackendKind()).toBe("canvas2d")
    expect(events).toEqual(["gl-draw", "fallback-draw", "reveal:canvas2d"])
    renderer.dispose()
  })

  test("context loss and restoration reveal each surface only after it drew a current frame", () => {
    // Given a GL backend with lifecycle hooks and a recording fallback
    const events: string[] = []
    let lose: (() => void) | undefined
    let restore: (() => void) | undefined
    const glBackend: FrameBackend = {
      kind: "webgl2",
      resize() {},
      draw(input) {
        events.push(input.staticFrame ? "gl-static" : "gl-draw")
      },
      setContextLifecycle(listeners) {
        lose = listeners.lost
        restore = listeners.restored
        return () => {
          lose = undefined
          restore = undefined
        }
      },
      dispose() {},
    }
    const fallbackBackend: FrameBackend = {
      kind: "canvas2d",
      resize() {},
      draw(input) {
        events.push(input.staticFrame ? "fallback-static" : "fallback-draw")
      },
      dispose() {},
    }
    const fake = createFakeScheduler()
    const clock = { nowMs: 0 }
    const renderer = createGenerativeRenderer({
      canvas: stubCanvas(),
      preset: "moment",
      scheduler: fake.scheduler,
      now: () => clock.nowMs,
      createBackend: (prefer) =>
        prefer === "webgl2" ? glBackend : fallbackBackend,
      onBackendChange: (kind) => events.push(`reveal:${kind}`),
    })
    renderer.start()

    // When the GL context is lost
    lose?.()

    // Then the loop parks and the fallback was revealed after one static frame
    expect(events).toEqual([
      "gl-draw",
      "reveal:webgl2",
      "fallback-static",
      "reveal:canvas2d",
    ])
    expect(fake.pendingCount()).toBe(0)

    // When the context is restored
    restore?.()

    // Then GL is revealed only after a fresh frame and one loop resumes
    expect(events).toEqual([
      "gl-draw",
      "reveal:webgl2",
      "fallback-static",
      "reveal:canvas2d",
      "gl-draw",
      "reveal:webgl2",
    ])
    expect(fake.pendingCount()).toBe(1)
    renderer.dispose()
  })
})
