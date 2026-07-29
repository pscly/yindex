import type { GenerativePreset } from "@yindex/domain"
import { getGenerativePresetDescriptor } from "./generativePresets"
import type { FrameDrawInput, FrameScheduler } from "./generativeRendererTypes"

const MAX_DEVICE_PIXEL_RATIO = 1.5
const DEVICE_PIXEL_RATIO_STEP = 0.25
const SLOW_FRAME_LIMIT = 4

export const defaultScheduler: FrameScheduler = {
  schedule: (cb) => requestAnimationFrame((t) => cb(t)),
  cancel: (id) => cancelAnimationFrame(id),
}

export function frameDrawInput(
  preset: GenerativePreset,
  frame: {
    readonly staticFrame: boolean
    readonly timeMs: number
    readonly originMs: number
  },
): FrameDrawInput {
  return {
    preset,
    descriptor: getGenerativePresetDescriptor(preset),
    timeSeconds: frame.staticFrame
      ? 0
      : Math.max(0, (frame.timeMs - frame.originMs) / 1000),
    staticFrame: frame.staticFrame,
  }
}

export function createPixelRatioGovernor(input: {
  readonly frameIntervalMs: number
  readonly initialRatio: number
}): {
  readonly ratio: () => number
  readonly recordDraw: (drawDurationMs: number) => boolean
} {
  let renderRatio = Number.isFinite(input.initialRatio)
    ? Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, input.initialRatio))
    : 1
  let slowFrames = 0
  return {
    ratio: () => renderRatio,
    recordDraw(drawDurationMs) {
      slowFrames = drawDurationMs > input.frameIntervalMs ? slowFrames + 1 : 0
      if (slowFrames >= SLOW_FRAME_LIMIT && renderRatio > 1) {
        renderRatio = Math.max(1, renderRatio - DEVICE_PIXEL_RATIO_STEP)
        slowFrames = 0
        return true
      }
      return false
    },
  }
}
