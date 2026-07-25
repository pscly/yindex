/** Minimal 2d surface for generative paint (testable without full DOM Canvas). */
export type GenerativeCanvas2D = {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, w: number, h: number): void
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): {
    addColorStop(offset: number, color: string): void
  }
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void
}

/** Visible canvas port: 2d on this surface; webgl2 lives on a detached element. */
export type GenerativeCanvasPort = {
  width: number
  height: number
  getContext(contextId: "2d", options?: unknown): GenerativeCanvas2D | null
  getContext(
    contextId: "webgl2",
    options?: unknown,
  ): WebGL2RenderingContext | null
  getContext(
    contextId: string,
    options?: unknown,
  ): GenerativeCanvas2D | WebGL2RenderingContext | null
}

export function asCanvas2D(
  ctx: GenerativeCanvas2D | WebGL2RenderingContext | null,
): GenerativeCanvas2D | null {
  if (!ctx) return null
  if ("fillRect" in ctx && typeof ctx.fillRect === "function") {
    return ctx
  }
  return null
}
