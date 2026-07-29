/** WCAG 2.x normal-text contrast floor (AA). */
export const MIN_TEXT_CONTRAST = 4.5

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Contrast of two relative luminances (WCAG). */
export function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

/** Blend wallpaper L toward overlay L by opacity. */
export function mixL(baseL: number, overL: number, opacity: number): number {
  const t = clamp(opacity, 0, 1)
  return baseL * (1 - t) + overL * t
}

/** Relative luminance of an emitted OKLCH color after OKLab → linear sRGB. */
export function oklchRelativeLuminance(
  lightness: number,
  chroma: number,
  hue: number,
): number {
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const red = clamp(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    0,
    1,
  )
  const green = clamp(
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    0,
    1,
  )
  const blue = clamp(
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    0,
    1,
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

type Rgb = readonly [red: number, green: number, blue: number]

function linearToSrgb(channel: number): number {
  const clamped = clamp(channel, 0, 1)
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055
}

function oklchToSrgb(lightness: number, chroma: number, hue: number): Rgb {
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function compositeSrgb(base: Rgb, overlay: Rgb, opacity: number): Rgb {
  const alpha = clamp(opacity, 0, 1)
  return [
    base[0] * (1 - alpha) + overlay[0] * alpha,
    base[1] * (1 - alpha) + overlay[1] * alpha,
    base[2] * (1 - alpha) + overlay[2] * alpha,
  ]
}

function srgbRelativeLuminance(rgb: Rgb): number {
  const linearChannel = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  return (
    0.2126 * linearChannel(rgb[0]) +
    0.7152 * linearChannel(rgb[1]) +
    0.0722 * linearChannel(rgb[2])
  )
}

export type ContentDirectContrast = {
  readonly foregroundL: number
  readonly mutedL: number
  readonly mutedOklchL: number
  readonly effectiveBackgroundL: number
  readonly contrastRatio: number
  readonly mutedContrastRatio: number
  readonly scrimOpacity: number
}

export type SurfaceColorInput = {
  readonly foregroundOklchL: number
  readonly mutedOklchL: number
  readonly tintOklchL: number
  readonly tintOpacity: number
  readonly scrimOklchL: number
  readonly scrimOpacity: number
}

export type SurfaceColorTokens = ContentDirectContrast & {
  readonly foreground: string
  readonly mutedForeground: string
  readonly tint: string
  readonly tintOpacity: number
  readonly scrim: string
}

export function resolveContentDirectContrast(
  input: SurfaceColorInput & {
    readonly wallpaperL: number
  },
): ContentDirectContrast {
  const foregroundL = oklchRelativeLuminance(input.foregroundOklchL, 0.02, 250)
  const wallpaperChannel = linearToSrgb(input.wallpaperL)
  const wallpaper: Rgb = [wallpaperChannel, wallpaperChannel, wallpaperChannel]
  const tint = oklchToSrgb(input.tintOklchL, 0.02, 250)
  const scrim = oklchToSrgb(input.scrimOklchL, 0.01, 250)
  const tinted = compositeSrgb(wallpaper, tint, input.tintOpacity)
  const backdropAt = (opacity: number): number =>
    srgbRelativeLuminance(compositeSrgb(tinted, scrim, opacity))
  let scrimOpacity = input.scrimOpacity
  if (
    contrastRatio(foregroundL, backdropAt(scrimOpacity)) < MIN_TEXT_CONTRAST
  ) {
    let lo = scrimOpacity
    let hi = 1
    for (let index = 0; index < 28; index++) {
      const mid = (lo + hi) / 2
      if (contrastRatio(foregroundL, backdropAt(mid)) >= MIN_TEXT_CONTRAST) {
        hi = mid
      } else lo = mid
    }
    scrimOpacity = clamp(hi + 0.008, 0, 1)
  }
  const effectiveBackgroundL = backdropAt(scrimOpacity)
  const mutedOklchL = resolveMutedOklchL(
    input.mutedOklchL,
    input.foregroundOklchL,
    effectiveBackgroundL,
  )
  const mutedL = oklchRelativeLuminance(mutedOklchL, 0.012, 250)
  return {
    foregroundL,
    mutedL,
    mutedOklchL,
    effectiveBackgroundL,
    contrastRatio: contrastRatio(foregroundL, effectiveBackgroundL),
    mutedContrastRatio: contrastRatio(mutedL, effectiveBackgroundL),
    scrimOpacity,
  }
}

export function resolveSurfaceColorTokens(
  input: SurfaceColorInput,
  wallpaperL?: number,
): SurfaceColorTokens {
  const contrast =
    wallpaperL === undefined
      ? {
          foregroundL: input.foregroundOklchL,
          mutedL: input.mutedOklchL,
          mutedOklchL: input.mutedOklchL,
          effectiveBackgroundL: 0,
          contrastRatio: 0,
          mutedContrastRatio: 0,
          scrimOpacity: input.scrimOpacity,
        }
      : resolveContentDirectContrast({ ...input, wallpaperL })
  return {
    ...contrast,
    foreground: oklch(input.foregroundOklchL, 0.02, 250),
    mutedForeground: oklch(contrast.mutedOklchL, 0.012, 250),
    tint: oklch(input.tintOklchL, 0.02, 250, input.tintOpacity),
    tintOpacity: input.tintOpacity,
    scrim: oklch(input.scrimOklchL, 0.01, 250, contrast.scrimOpacity),
  }
}

function resolveMutedOklchL(
  seed: number,
  foreground: number,
  backgroundL: number,
): number {
  if (
    contrastRatio(oklchRelativeLuminance(seed, 0.012, 250), backgroundL) >=
    MIN_TEXT_CONTRAST
  ) {
    return seed
  }
  let lo = 0
  let hi = 1
  for (let index = 0; index < 28; index++) {
    const progress = (lo + hi) / 2
    const lightness = seed + progress * (foreground - seed)
    const ratio = contrastRatio(
      oklchRelativeLuminance(lightness, 0.012, 250),
      backgroundL,
    )
    if (ratio >= MIN_TEXT_CONTRAST) hi = progress
    else lo = progress
  }
  return seed + Math.min(1, hi + 0.002) * (foreground - seed)
}

/**
 * Minimum overlay opacity so contrast(fg, mix(bg, overlayL, s)) >= floor.
 * Overlay L must pull the field away from the foreground.
 */
export function minOverlayForFloor(
  fgL: number,
  bgL: number,
  overlayL: number,
  floor: number,
): number {
  if (contrastRatio(fgL, bgL) >= floor) return 0
  let lo = 0
  let hi = 1
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    const eff = mixL(bgL, overlayL, mid)
    if (contrastRatio(fgL, eff) >= floor) hi = mid
    else lo = mid
  }
  return clamp(hi + 0.008, 0, 1)
}

export function oklch(l: number, c: number, h: number, alpha?: number): string {
  const L = clamp(l, 0, 1)
  const C = clamp(c, 0, 0.4)
  const H = ((h % 360) + 360) % 360
  if (alpha === undefined) {
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(1)})`
  }
  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(1)} / ${clamp(alpha, 0, 1).toFixed(4)})`
}
