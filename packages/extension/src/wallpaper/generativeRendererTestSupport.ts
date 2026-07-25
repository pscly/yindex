import type { GenerativePreset } from "@yindex/domain"
import type {
  FrameBackend,
  FrameScheduler,
  GenerativeCanvasPort,
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
