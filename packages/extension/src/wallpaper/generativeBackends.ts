import type {
  GenerativeCanvas2D,
  GenerativeCanvasPort,
} from "./generativeCanvasPort"
import { asCanvas2D } from "./generativeCanvasPort"
import type { GenerativeSurfacePair } from "./generativeCanvasSurface"
import { createWebGL2Backend } from "./generativeGlBackend"
import type { Rgb01 } from "./generativePresets"
import type {
  BackendKind,
  FrameBackend,
  FrameDrawInput,
} from "./generativeRendererTypes"
import { GenerativeRendererError } from "./generativeRendererTypes"

export { createWebGL2Backend }

function rgbCss(c: Rgb01, a = 1): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`
}

export function createCanvas2DBackend(
  visible: GenerativeCanvasPort,
): FrameBackend {
  const ctx = asCanvas2D(visible.getContext("2d"))
  if (!ctx) {
    throw new GenerativeRendererError("canvas2d_unavailable", "2d missing")
  }
  return {
    kind: "canvas2d",
    resize(w: number, h: number) {
      if (visible.width !== w) visible.width = w
      if (visible.height !== h) visible.height = h
    },
    draw(input: FrameDrawInput) {
      drawCanvas2D(ctx, visible.width, visible.height, input)
    },
    dispose() {},
  }
}

export function drawCanvas2D(
  ctx: GenerativeCanvas2D,
  w: number,
  h: number,
  input: FrameDrawInput,
): void {
  if (w <= 0 || h <= 0) return
  const d = input.descriptor
  const c0 = d.colors[0] ?? ([0.2, 0.2, 0.25] as const)
  const c1 = d.colors[1] ?? c0
  const c2 = d.colors[2] ?? c1
  const t = input.timeSeconds * d.speed
  ctx.fillStyle = rgbCss(c0)
  ctx.fillRect(0, 0, w, h)
  const g = ctx.createRadialGradient(
    w * (0.35 + 0.15 * Math.sin(t * 0.7)),
    h * (0.4 + 0.12 * Math.cos(t * 0.55)),
    0,
    w * 0.35,
    h * 0.4,
    Math.max(w, h) * 0.7,
  )
  g.addColorStop(0, rgbCss(c1, 0.85))
  g.addColorStop(0.55, rgbCss(c2, 0.45))
  g.addColorStop(1, rgbCss(c0, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  d.auroraColors.forEach((ac, i) => {
    const ax = w * (0.2 + 0.6 * ((i + 1) / (d.auroraColors.length + 1)))
    const ay = h * (0.3 + 0.2 * Math.sin(t * 0.4 + i))
    const ag = ctx.createRadialGradient(
      ax,
      ay,
      0,
      ax,
      ay,
      Math.max(w, h) * 0.35,
    )
    ag.addColorStop(0, rgbCss(ac, 0.35))
    ag.addColorStop(1, rgbCss(ac, 0))
    ctx.fillStyle = ag
    ctx.fillRect(0, 0, w, h)
  })
}

export function createDefaultBackend(
  surfaces: GenerativeSurfacePair,
  prefer: BackendKind = "webgl2",
): FrameBackend {
  if (prefer === "canvas2d") return createCanvas2DBackend(surfaces.canvas2d)
  try {
    return createWebGL2Backend(surfaces.gl)
  } catch (e) {
    if (e instanceof Error) return createCanvas2DBackend(surfaces.canvas2d)
    throw e
  }
}

export function resolveBackend(
  surfaces: GenerativeSurfacePair | undefined,
  factory: ((prefer: BackendKind) => FrameBackend) | undefined,
): FrameBackend {
  if (!factory) {
    if (!surfaces) {
      throw new GenerativeRendererError(
        "canvas2d_unavailable",
        "visible surfaces missing",
      )
    }
    return createDefaultBackend(surfaces)
  }
  try {
    return factory("webgl2")
  } catch (e) {
    if (!(e instanceof Error)) throw e
    return factory("canvas2d")
  }
}
