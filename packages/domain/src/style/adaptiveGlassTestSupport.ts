import { expect } from "bun:test"
import {
  type AdaptiveGlassInput,
  type AdaptiveResolvedGlass,
  type AdaptiveSurfaceTokens,
  MIN_TEXT_CONTRAST,
  parseAdaptiveGlassInput,
} from "./adaptiveGlass"

const PROFILE_BANDS = {
  clear: { blur: { min: 14, max: 18 }, tint: { min: 0.08, max: 0.14 } },
  balanced: { blur: { min: 22, max: 28 }, tint: { min: 0.16, max: 0.24 } },
  deep: { blur: { min: 30, max: 40 }, tint: { min: 0.28, max: 0.4 } },
} as const

type ProfileWithBand = keyof typeof PROFILE_BANDS

export function contrastFromL(fgL: number, bgL: number): number {
  const a = Math.max(fgL, bgL)
  const b = Math.min(fgL, bgL)
  return (a + 0.05) / (b + 0.05)
}

export function srgbRelL(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const r = channel((n >> 16) & 0xff)
  const g = channel((n >> 8) & 0xff)
  const b = channel(n & 0xff)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function mustInput(raw: {
  readonly luminance: number
  readonly chroma: number
  readonly detail: number
}): AdaptiveGlassInput {
  const result = parseAdaptiveGlassInput(raw)
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

export function assertTextFloors(branch: AdaptiveSurfaceTokens): void {
  const primary = contrastFromL(branch.foregroundL, branch.effectiveBackgroundL)
  const muted = contrastFromL(branch.mutedL, branch.effectiveBackgroundL)
  expect(primary).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  expect(muted).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  expect(branch.contrastRatio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  expect(branch.mutedContrastRatio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  expect(Number.isFinite(branch.contrastRatio)).toBe(true)
  expect(Number.isFinite(branch.mutedContrastRatio)).toBe(true)
  expect(Number.isFinite(branch.foregroundL)).toBe(true)
  expect(Number.isFinite(branch.effectiveBackgroundL)).toBe(true)
}

export function assertProfileBand(
  profile: ProfileWithBand,
  glass: AdaptiveResolvedGlass,
): void {
  const band = PROFILE_BANDS[profile]
  expect(glass.blurPx).toBeGreaterThanOrEqual(band.blur.min)
  expect(glass.blurPx).toBeLessThanOrEqual(band.blur.max)
  expect(glass.opacity).toBeGreaterThanOrEqual(band.tint.min)
  expect(glass.opacity).toBeLessThanOrEqual(band.tint.max)
  expect(glass.adaptive.lens.tintOpacity).toBeGreaterThanOrEqual(band.tint.min)
  expect(glass.adaptive.lens.tintOpacity).toBeLessThanOrEqual(band.tint.max)
}

export function assertFiniteMaterial(glass: AdaptiveResolvedGlass): void {
  const numericTokens = [
    glass.blurPx,
    glass.opacity,
    glass.highlight,
    glass.saturation,
    glass.adaptive.lens.tintOpacity,
    glass.adaptive.lens.scrimOpacity,
    glass.adaptive.lens.contrastRatio,
    glass.adaptive.contentDirect.tintOpacity,
    glass.adaptive.contentDirect.scrimOpacity,
    glass.adaptive.contentDirect.contrastRatio,
  ]
  for (const token of numericTokens) {
    expect(Number.isFinite(token)).toBe(true)
  }
  for (const cssToken of [
    glass.adaptive.lens.foreground,
    glass.adaptive.lens.mutedForeground,
    glass.adaptive.lens.tint,
    glass.adaptive.lens.scrim,
    glass.adaptive.contentDirect.foreground,
    glass.adaptive.contentDirect.mutedForeground,
    glass.adaptive.contentDirect.tint,
    glass.adaptive.contentDirect.scrim,
    glass.adaptive.foreground,
    glass.adaptive.mutedForeground,
    glass.adaptive.tint,
    glass.adaptive.scrim,
  ]) {
    expect(cssToken.includes("NaN")).toBe(false)
    expect(cssToken.includes("Infinity")).toBe(false)
  }
}
