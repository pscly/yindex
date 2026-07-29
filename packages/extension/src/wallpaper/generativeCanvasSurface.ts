import type { GenerativeCanvasPort } from "./generativeCanvasPort"

/** Component-owned visible GL canvas with context-loss event access. */
export type DirectGLSurface = {
  readonly canvas: GenerativeCanvasPort
  listenForContextChange(
    lost: (event: Event) => void,
    restored: () => void,
  ): () => void
}

/** Stacked visible surfaces owned by the host: one GL, one Canvas2D fallback. */
export type GenerativeSurfacePair = {
  readonly gl: DirectGLSurface
  readonly canvas2d: GenerativeCanvasPort
}

export function createDirectGLSurface(
  canvas: HTMLCanvasElement,
): DirectGLSurface {
  return {
    canvas,
    listenForContextChange(lost, restored) {
      canvas.addEventListener("webglcontextlost", lost)
      canvas.addEventListener("webglcontextrestored", restored)
      return () => {
        canvas.removeEventListener("webglcontextlost", lost)
        canvas.removeEventListener("webglcontextrestored", restored)
      }
    },
  }
}
