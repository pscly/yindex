import type { GenerativePreset } from "@yindex/domain"
import type { GenerativeCanvasPort } from "./generativeCanvasPort"
import type { FreshCanvasFactory } from "./generativeCanvasSurface"
import type { GenerativePresetDescriptor } from "./generativePresets"

export type BackendKind = "webgl2" | "canvas2d"
export type { GenerativeCanvasPort }

export type FrameDrawInput = {
  readonly preset: GenerativePreset
  readonly descriptor: GenerativePresetDescriptor
  readonly timeSeconds: number
  readonly staticFrame: boolean
}

export type FrameBackend = {
  readonly kind: BackendKind
  resize(width: number, height: number): void
  draw(input: FrameDrawInput): void
  setContextLifecycle?(listeners: ContextLifecycle): () => void
  dispose(): void
}

export type ContextLifecycle = {
  readonly lost: () => void
  readonly restored: () => void
}

export type FrameScheduler = {
  schedule(cb: (nowMs: number) => void): number
  cancel(id: number): void
}

export type GenerativeRendererOptions = {
  readonly canvas: GenerativeCanvasPort
  readonly preset: GenerativePreset
  readonly active?: boolean
  readonly reducedMotion?: boolean
  readonly maxFps?: number
  readonly scheduler?: FrameScheduler
  readonly now?: () => number
  readonly pixelRatio?: () => number
  readonly createCanvas?: FreshCanvasFactory
  readonly createBackend?: (prefer: BackendKind) => FrameBackend
}

export type GenerativeRenderer = {
  start(): void
  pause(): void
  resume(): void
  setActive(active: boolean): void
  setReducedMotion(reduced: boolean): void
  setPreset(preset: GenerativePreset): void
  resize(width: number, height: number): void
  renderStaticFrame(): void
  getBackendKind(): BackendKind
  dispose(): void
}

export class GenerativeRendererError extends Error {
  readonly code: "canvas2d_unavailable" | "webgl2_unavailable" | "shader_failed"
  constructor(code: GenerativeRendererError["code"], message: string) {
    super(message)
    this.name = "GenerativeRendererError"
    this.code = code
  }
}
