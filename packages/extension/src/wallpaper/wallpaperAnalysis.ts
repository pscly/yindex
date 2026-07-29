import { type AdaptiveGlassInput, BALANCED_SAFE_ANALYSIS } from "@yindex/domain"

export type PixelSample = {
  readonly width: number
  readonly height: number
  readonly data: readonly number[] | Uint8ClampedArray
}

export type PixelAnalysisResult = {
  readonly analysis: AdaptiveGlassInput
  readonly usedFallback: boolean
}

const FALLBACK_RESULT: PixelAnalysisResult = {
  analysis: BALANCED_SAFE_ANALYSIS,
  usedFallback: true,
}

export function analyzePixelSample(sample: PixelSample): PixelAnalysisResult {
  const pixelCount = sample.width * sample.height
  if (
    !Number.isSafeInteger(sample.width) ||
    !Number.isSafeInteger(sample.height) ||
    sample.width <= 0 ||
    sample.height <= 0 ||
    sample.data.length !== pixelCount * 4
  ) {
    return FALLBACK_RESULT
  }

  const luminances: number[] = []
  let luminanceSum = 0
  let chromaSum = 0
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4
    const red = sample.data[offset]
    const green = sample.data[offset + 1]
    const blue = sample.data[offset + 2]
    const alpha = sample.data[offset + 3]
    if (
      red === undefined ||
      green === undefined ||
      blue === undefined ||
      alpha === undefined ||
      !isChannel(red) ||
      !isChannel(green) ||
      !isChannel(blue) ||
      !isChannel(alpha)
    ) {
      return FALLBACK_RESULT
    }

    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
    luminances.push(luminance)
    luminanceSum += luminance
    chromaSum += (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255
  }

  let edgeEnergy = 0
  let edgeCount = 0
  for (let y = 0; y < sample.height; y += 1) {
    for (let x = 0; x < sample.width; x += 1) {
      const index = y * sample.width + x
      const current = luminances[index]
      if (current === undefined) return FALLBACK_RESULT
      if (x + 1 < sample.width) {
        const right = luminances[index + 1]
        if (right === undefined) return FALLBACK_RESULT
        edgeEnergy += Math.abs(current - right)
        edgeCount += 1
      }
      if (y + 1 < sample.height) {
        const below = luminances[index + sample.width]
        if (below === undefined) return FALLBACK_RESULT
        edgeEnergy += Math.abs(current - below)
        edgeCount += 1
      }
    }
  }

  return {
    analysis: {
      luminance: luminanceSum / pixelCount,
      chroma: chromaSum / pixelCount,
      detail: edgeCount === 0 ? 0 : edgeEnergy / edgeCount,
    },
    usedFallback: false,
  }
}

function isChannel(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 255
}
