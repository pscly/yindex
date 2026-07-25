import type {
  GenerativeCanvas2D,
  GenerativeCanvasPort,
} from "./generativeCanvasPort"
import { GenerativeRendererError } from "./generativeRendererTypes"

export type FreshCanvasSurface = {
  readonly canvas: GenerativeCanvasPort
  compositeTo(target: GenerativeCanvas2D, width: number, height: number): void
  listenForContextChange(
    lost: (event: Event) => void,
    restored: () => void,
  ): () => void
}

export type FreshCanvasFactory = () => FreshCanvasSurface

export function createFreshCanvasSurface(): FreshCanvasSurface {
  if (
    typeof document === "undefined" ||
    typeof document.createElement !== "function"
  ) {
    throw new GenerativeRendererError(
      "canvas2d_unavailable",
      "no document for canvas surface",
    )
  }
  const canvas = document.createElement("canvas")
  return {
    canvas,
    compositeTo(target, width, height) {
      target.drawImage(canvas, 0, 0, width, height)
    },
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
