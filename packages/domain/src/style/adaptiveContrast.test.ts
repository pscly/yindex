import { describe, expect, test } from "bun:test"
import { MIN_TEXT_CONTRAST } from "./adaptiveContrast"
import { solveAdaptiveGlass } from "./adaptiveGlass"
import { DEFAULT_GLASS_TUNING } from "./glass"

type Rgb = readonly [red: number, green: number, blue: number]
type OklchColor = {
  readonly srgb: Rgb
  readonly alpha: number
}

function linearToSrgb(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel))
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055
}

function parseOklch(css: string): OklchColor {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(
    css,
  )
  if (match === null) throw new Error(`invalid oklch color: ${css}`)
  const lightness = Number(match[1])
  const chroma = Number(match[2])
  const hue = Number(match[3])
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return {
    srgb: [
      linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ],
    alpha,
  }
}

function composite(base: Rgb, overlay: OklchColor): Rgb {
  return [
    base[0] * (1 - overlay.alpha) + overlay.srgb[0] * overlay.alpha,
    base[1] * (1 - overlay.alpha) + overlay.srgb[1] * overlay.alpha,
    base[2] * (1 - overlay.alpha) + overlay.srgb[2] * overlay.alpha,
  ]
}

function relativeLuminance(rgb: Rgb): number {
  const linearChannel = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  return (
    0.2126 * linearChannel(rgb[0]) +
    0.7152 * linearChannel(rgb[1]) +
    0.0722 * linearChannel(rgb[2])
  )
}

function contrast(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

describe("Adaptive content-direct true WCAG contrast", () => {
  test("Given bright and dark wallpapers, When emitted overlays are composited, Then primary and muted text independently meet 4.5:1", () => {
    // Given
    const wallpaperLuminances = [0.88, 0.14] as const

    for (const luminance of wallpaperLuminances) {
      // When
      const branch = solveAdaptiveGlass({
        profile: "balanced",
        tuning: DEFAULT_GLASS_TUNING,
        analysis: { luminance, chroma: 0.07, detail: 0.25 },
      }).adaptive.contentDirect
      const wallpaperChannel = linearToSrgb(luminance)
      const wallpaper: Rgb = [
        wallpaperChannel,
        wallpaperChannel,
        wallpaperChannel,
      ]
      const backdrop = composite(
        composite(wallpaper, parseOklch(branch.tint)),
        parseOklch(branch.scrim),
      )
      const backdropLuminance = relativeLuminance(backdrop)
      const primary = contrast(
        relativeLuminance(parseOklch(branch.foreground).srgb),
        backdropLuminance,
      )
      const muted = contrast(
        relativeLuminance(parseOklch(branch.mutedForeground).srgb),
        backdropLuminance,
      )

      // Then
      expect(primary).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(muted).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  test("Given lens surfaces, When emitted overlays are composited, Then contrast metadata describes the same backdrop", () => {
    // Given
    const wallpaperLuminances = [0.88, 0.14] as const

    for (const luminance of wallpaperLuminances) {
      // When
      const branch = solveAdaptiveGlass({
        profile: "balanced",
        tuning: DEFAULT_GLASS_TUNING,
        analysis: { luminance, chroma: 0.07, detail: 0.25 },
      }).adaptive.lens
      const wallpaperChannel = linearToSrgb(luminance)
      const wallpaper: Rgb = [
        wallpaperChannel,
        wallpaperChannel,
        wallpaperChannel,
      ]
      const backdrop = composite(
        composite(wallpaper, parseOklch(branch.tint)),
        parseOklch(branch.scrim),
      )
      const backdropLuminance = relativeLuminance(backdrop)
      const primary = contrast(
        relativeLuminance(parseOklch(branch.foreground).srgb),
        backdropLuminance,
      )
      const muted = contrast(
        relativeLuminance(parseOklch(branch.mutedForeground).srgb),
        backdropLuminance,
      )

      // Then
      expect(primary).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(muted).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(branch.effectiveBackgroundL).toBeCloseTo(backdropLuminance, 3)
      expect(branch.contrastRatio).toBeCloseTo(primary, 2)
      expect(branch.mutedContrastRatio).toBeCloseTo(muted, 2)
    }
  })
})
