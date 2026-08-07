import { describe, expect, test } from "bun:test"
import type { GenerativePreset } from "@yindex/domain"
import { createWebGL2Backend, drawCanvas2D } from "./generativeBackends"
import { getGenerativePreset } from "./generativePresets"
import {
  Fake2DContext,
  FakeGLContext,
  FakeSurfaceCanvas,
  fakeDirectGLSurface,
} from "./generativeRendererTestSupport"
import type { FrameDrawInput } from "./generativeRendererTypes"

function frameInput(
  preset: GenerativePreset,
  timeSeconds = 12,
): FrameDrawInput {
  return {
    preset,
    descriptor: getGenerativePreset(preset),
    timeSeconds,
    staticFrame: false,
  }
}

describe("drawCanvas2D light-field construction", () => {
  test("paints a directional linear-gradient base plus two large soft blobs", () => {
    // Given a moment frame on a recording 2D context
    const ctx = new Fake2DContext()
    // When
    drawCanvas2D(ctx, 1280, 720, frameInput("moment"))
    // Then — vertical skylight gradient + blob pair, no aurora/glint layers
    expect(ctx.linearGradientCalls).toBe(1)
    expect(ctx.radialGradientCalls).toBe(2)
    expect(ctx.fillRectCalls).toBe(3)
  })

  test("flow paints two segmented aurora ribbons over the deep base", () => {
    // Given a flow frame
    const ctx = new Fake2DContext()
    // When
    drawCanvas2D(ctx, 1280, 720, frameInput("flow"))
    // Then — 2 blobs + 2 ribbons x 6 segments
    expect(ctx.radialGradientCalls).toBe(2 + 12)
  })

  test("muse paints warm glint spots over the ink base", () => {
    // Given a muse frame
    const ctx = new Fake2DContext()
    // When
    drawCanvas2D(ctx, 1280, 720, frameInput("muse"))
    // Then — 2 blobs + 4 ember glints
    expect(ctx.radialGradientCalls).toBe(2 + 4)
  })

  test("zero-size canvas is a no-op", () => {
    // Given a degenerate canvas
    const ctx = new Fake2DContext()
    // When
    drawCanvas2D(ctx, 0, 0, frameInput("flow"))
    // Then
    expect(ctx.fillRectCalls).toBe(0)
    expect(ctx.linearGradientCalls).toBe(0)
  })
})

describe("webgl2 backend shader contract", () => {
  test("fragment shader wires directional light, aurora, glints and film grain uniforms", () => {
    // Given a fake GL surface
    const gl = new FakeGLContext({ value: 0 })
    const canvas = new FakeSurfaceCanvas({ gl })
    const backend = createWebGL2Backend(fakeDirectGLSurface(canvas))
    // When the program is built and a muse frame is drawn
    const frag =
      gl.shaderSources.find((source) => source.includes("gl_FragCoord")) ?? ""
    backend.resize(640, 360)
    backend.draw(frameInput("muse"))
    // Then the shader declares and the backend binds the new field uniforms
    expect(frag).toContain("u_grain")
    expect(frag).toContain("u_glint")
    expect(frag).toContain("u_aurora")
    expect(gl.uniformNames).toContain("u_grain")
    expect(gl.uniformNames).toContain("u_glint")
    expect(gl.uniformNames).toContain("u_g0")
    expect(gl.drawArraysCalls).toBe(1)
    backend.dispose()
  })
})
