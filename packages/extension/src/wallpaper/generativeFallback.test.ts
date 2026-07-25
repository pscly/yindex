import { describe, expect, test } from "bun:test"
import { createGenerativeRenderer } from "./generativeRenderer"
import {
  type DrawRecord,
  createFakeScheduler,
  stubCanvas,
} from "./generativeRendererTestSupport"

describe("generative backend fallback", () => {
  test("shader initialization failure degrades to Canvas2D", () => {
    // Given
    let attempts = 0
    const draws: DrawRecord[] = []
    const renderer = createGenerativeRenderer({
      canvas: stubCanvas(),
      preset: "muse",
      reducedMotion: true,
      scheduler: createFakeScheduler().scheduler,
      now: () => 0,
      createBackend: () => {
        attempts += 1
        if (attempts === 1) throw new Error("webgl compile failed")
        return {
          kind: "canvas2d",
          resize() {},
          draw(input) {
            draws.push({
              preset: input.preset,
              timeSeconds: input.timeSeconds,
              staticFrame: input.staticFrame,
              width: 0,
              height: 0,
            })
          },
          dispose() {},
        }
      },
    })

    // When
    renderer.start()

    // Then
    expect(renderer.getBackendKind()).toBe("canvas2d")
    expect(draws).toHaveLength(1)
    renderer.dispose()
  })

  test("draw-time WebGL failure disposes GL and draws Canvas2D fallback", () => {
    // Given
    let webglDisposed = false
    const canvas2dDraws: DrawRecord[] = []
    let phase: "webgl" | "canvas2d" = "webgl"
    const renderer = createGenerativeRenderer({
      canvas: stubCanvas(),
      preset: "flow",
      reducedMotion: true,
      scheduler: createFakeScheduler().scheduler,
      now: () => 0,
      createBackend: (preference) => {
        if (preference === "webgl2" || phase === "webgl") {
          phase = "canvas2d"
          return {
            kind: "webgl2",
            resize() {},
            draw() {
              throw new Error("link failed after context bind")
            },
            dispose() {
              webglDisposed = true
            },
          }
        }
        return {
          kind: "canvas2d",
          resize() {},
          draw(input) {
            canvas2dDraws.push({
              preset: input.preset,
              timeSeconds: input.timeSeconds,
              staticFrame: input.staticFrame,
              width: 0,
              height: 0,
            })
          },
          dispose() {},
        }
      },
    })

    // When
    renderer.start()

    // Then
    expect(webglDisposed).toBe(true)
    expect(renderer.getBackendKind()).toBe("canvas2d")
    expect(canvas2dDraws).toHaveLength(1)
    renderer.dispose()
  })
})
