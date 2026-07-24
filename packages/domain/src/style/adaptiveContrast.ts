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
