import type { GenerativePreset } from "@yindex/domain"
import type {
  GenerativeCanvas2D,
  GenerativeCanvasPort,
  GenerativeGLContext,
} from "./generativeCanvasPort"
import type { DirectGLSurface } from "./generativeCanvasSurface"
import type {
  FrameBackend,
  FrameScheduler,
  GenerativeRenderer,
} from "./generativeRenderer"
import { TARGET_FPS, createGenerativeRenderer } from "./generativeRenderer"

export type DrawRecord = {
  readonly preset: GenerativePreset
  readonly timeSeconds: number
  readonly staticFrame: boolean
  readonly width: number
  readonly height: number
}

export function createRecordingBackend(
  kind: FrameBackend["kind"] = "canvas2d",
): {
  readonly backend: FrameBackend
  readonly draws: DrawRecord[]
  readonly disposed: { value: boolean }
} {
  const draws: DrawRecord[] = []
  const disposed = { value: false }
  let width = 0
  let height = 0
  return {
    backend: {
      kind,
      resize(w, h) {
        width = w
        height = h
      },
      draw(input) {
        draws.push({
          preset: input.preset,
          timeSeconds: input.timeSeconds,
          staticFrame: input.staticFrame,
          width,
          height,
        })
      },
      dispose() {
        disposed.value = true
      },
    },
    draws,
    disposed,
  }
}

export function createFakeScheduler(): {
  readonly scheduler: FrameScheduler
  flush(nowMs: number): void
  pendingCount(): number
} {
  let nextId = 1
  const pending = new Map<number, (nowMs: number) => void>()
  return {
    scheduler: {
      schedule(callback) {
        const id = nextId
        nextId += 1
        pending.set(id, callback)
        return id
      },
      cancel(id) {
        pending.delete(id)
      },
    },
    flush(nowMs) {
      const batch = [...pending.values()]
      pending.clear()
      for (const callback of batch) callback(nowMs)
    },
    pendingCount: () => pending.size,
  }
}

export function stubCanvas(): GenerativeCanvasPort {
  return {
    width: 0,
    height: 0,
    getContext: () => null,
  }
}

export class Fake2DContext implements GenerativeCanvas2D {
  fillStyle: string | CanvasGradient | CanvasPattern = ""
  fillRectCalls = 0
  drawImageCalls = 0
  linearGradientCalls = 0
  radialGradientCalls = 0
  fillRect(): void {
    this.fillRectCalls += 1
  }
  createLinearGradient(): {
    addColorStop(offset: number, color: string): void
  } {
    this.linearGradientCalls += 1
    return { addColorStop() {} }
  }
  createRadialGradient(): {
    addColorStop(offset: number, color: string): void
  } {
    this.radialGradientCalls += 1
    return { addColorStop() {} }
  }
  drawImage(
    image: unknown,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number,
  ): void {
    void image
    void dx
    void dy
    void dw
    void dh
    this.drawImageCalls += 1
  }
}

export class FakeGLContext implements GenerativeGLContext {
  readonly VERTEX_SHADER = 0x8b31
  readonly FRAGMENT_SHADER = 0x8b30
  readonly COMPILE_STATUS = 0x8b81
  readonly LINK_STATUS = 0x8b82
  readonly ARRAY_BUFFER = 0x8892
  readonly STATIC_DRAW = 0x88e4
  readonly TRIANGLES = 0x0004
  readonly FLOAT = 0x1406
  drawArraysCalls = 0
  readonly shaderSources: string[] = []
  readonly uniformNames: string[] = []
  constructor(private readonly loseContextCounter: { value: number }) {}
  createShader(): object {
    return {}
  }
  shaderSource(_shader: object, source: string): void {
    this.shaderSources.push(source)
  }
  compileShader(): void {}
  getShaderParameter(): unknown {
    return true
  }
  deleteShader(): void {}
  createProgram(): object {
    return {}
  }
  attachShader(): void {}
  linkProgram(): void {}
  getProgramParameter(): unknown {
    return true
  }
  deleteProgram(): void {}
  createBuffer(): object {
    return {}
  }
  bindBuffer(): void {}
  bufferData(): void {}
  deleteBuffer(): void {}
  getAttribLocation(): number {
    return 0
  }
  getUniformLocation(_program: object, name: string): object {
    this.uniformNames.push(name)
    return {}
  }
  useProgram(): void {}
  enableVertexAttribArray(): void {}
  vertexAttribPointer(): void {}
  uniform1f(): void {}
  uniform2f(): void {}
  uniform3f(): void {}
  viewport(): void {}
  drawArrays(): void {
    this.drawArraysCalls += 1
  }
  getExtension(name: string): { loseContext(): void } | null {
    if (name !== "WEBGL_lose_context") return null
    const counter = this.loseContextCounter
    return {
      loseContext() {
        counter.value += 1
      },
    }
  }
}

export class FakeSurfaceCanvas implements GenerativeCanvasPort {
  width = 0
  height = 0
  readonly twoD = new Fake2DContext()
  readonly gl: FakeGLContext | null
  constructor(options: { readonly gl?: FakeGLContext | null } = {}) {
    this.gl = options.gl ?? null
  }
  getContext(contextId: "2d", options?: unknown): GenerativeCanvas2D | null
  getContext(contextId: "webgl2", options?: unknown): GenerativeGLContext | null
  getContext(
    contextId: string,
    options?: unknown,
  ): GenerativeCanvas2D | GenerativeGLContext | null
  getContext(
    contextId: string,
  ): GenerativeCanvas2D | GenerativeGLContext | null {
    if (contextId === "2d") return this.twoD
    if (contextId === "webgl2") return this.gl
    return null
  }
}

export function fakeDirectGLSurface(
  canvas: FakeSurfaceCanvas,
): DirectGLSurface {
  return {
    canvas,
    listenForContextChange() {
      return () => {}
    },
  }
}

export function mountRenderer(options: {
  readonly preset?: GenerativePreset
  readonly active?: boolean
  readonly reducedMotion?: boolean
  readonly maxFps?: number
}): {
  readonly renderer: GenerativeRenderer
  readonly draws: DrawRecord[]
  readonly disposed: { value: boolean }
  readonly fake: ReturnType<typeof createFakeScheduler>
  readonly clock: { nowMs: number }
} {
  const { backend, draws, disposed } = createRecordingBackend()
  const fake = createFakeScheduler()
  const clock = { nowMs: 0 }
  const renderer = createGenerativeRenderer({
    canvas: stubCanvas(),
    preset: options.preset ?? "moment",
    active: options.active ?? true,
    reducedMotion: options.reducedMotion ?? false,
    maxFps: options.maxFps ?? TARGET_FPS,
    scheduler: fake.scheduler,
    now: () => clock.nowMs,
    createBackend: () => backend,
  })
  return { renderer, draws, disposed, fake, clock }
}
