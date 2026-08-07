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

function hash01(x: number, y: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return v - Math.floor(v)
}

function softBlob(
  ctx: GenerativeCanvas2D,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb01,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  g.addColorStop(0, rgbCss(color, alpha))
  g.addColorStop(1, rgbCss(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
}

const GLINT_SPOTS = 4

export function drawCanvas2D(
  ctx: GenerativeCanvas2D,
  w: number,
  h: number,
  input: FrameDrawInput,
): void {
  if (w <= 0 || h <= 0) return
  const d = input.descriptor
  const cTop = d.colors[0] ?? ([0.2, 0.2, 0.25] as const)
  const cBlobA = d.colors[1] ?? cTop
  const cBottom = d.colors[2] ?? cBlobA
  const cBlobB = d.colors[3] ?? cBottom
  const t = input.timeSeconds * d.speed
  const span = Math.max(w, h)
  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, rgbCss(cTop))
  base.addColorStop(1, rgbCss(cBottom))
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  softBlob(
    ctx,
    w * (0.32 + 0.14 * Math.sin(t * 0.32)),
    h * (0.34 + 0.1 * Math.cos(t * 0.27)),
    span * 0.72,
    cBlobA,
    0.5,
  )
  softBlob(
    ctx,
    w * (0.68 + 0.12 * Math.cos(t * 0.24)),
    h * (0.62 + 0.12 * Math.sin(t * 0.29)),
    span * 0.58,
    cBlobB,
    0.34,
  )
  d.auroraColors.forEach((ac, band) => {
    const baseY = band === 0 ? 0.6 : 0.36
    const amp = band === 0 ? 0.17 : 0.14
    const dir = band === 0 ? 1 : -0.77
    const phase = band === 0 ? 0 : 2.2
    for (let i = 0; i < 6; i += 1) {
      const x = (i + 0.5) / 6
      const y = baseY + amp * Math.sin(x * 2.3 + t * 0.35 * dir + phase)
      softBlob(ctx, w * x, h * y, span * 0.24, ac, 0.22)
    }
  })
  if (d.glintColors.length > 0) {
    for (let i = 0; i < GLINT_SPOTS; i += 1) {
      const gc = d.glintColors[i % d.glintColors.length] ?? cTop
      const gx = 0.12 + 0.76 * hash01(i, 7.1)
      const gy = 0.14 + 0.7 * hash01(i, 3.7)
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.42 + i * 1.7)
      softBlob(ctx, w * gx, h * gy, span * 0.07, gc, 0.16 + 0.22 * pulse)
    }
  }
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
