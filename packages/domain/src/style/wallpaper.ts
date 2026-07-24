import { type Brand, brandAs } from "../ids/brand"
import { type Result, err, ok } from "../result/result"

export type MediaRef = Brand<string, "MediaRef">

export type WallpaperDim = Brand<number, "WallpaperDim">

export const GENERATIVE_PRESETS = ["moment", "muse", "flow"] as const
export type GenerativePreset = (typeof GENERATIVE_PRESETS)[number]

export type Wallpaper =
  | {
      readonly kind: "generative"
      readonly generativePreset: GenerativePreset
      readonly dim: WallpaperDim
    }
  | {
      readonly kind: "image"
      readonly mediaRef: MediaRef
      readonly dim: WallpaperDim
    }
  | {
      readonly kind: "video"
      readonly mediaRef: MediaRef
      readonly dim: WallpaperDim
    }

export type WallpaperParseError = {
  readonly code:
    | "invalid_dim"
    | "invalid_media_ref"
    | "invalid_preset"
    | "invalid_kind"
  readonly message: string
}

const DIM_MIN = 0
const DIM_MAX = 1

export function mediaRef(value: string): Result<MediaRef, WallpaperParseError> {
  if (value.length === 0) {
    return err({
      code: "invalid_media_ref",
      message: "mediaRef must be non-empty",
    })
  }
  return ok(brandAs(value))
}

export function wallpaperDim(
  value: number,
): Result<WallpaperDim, WallpaperParseError> {
  if (!Number.isFinite(value) || value < DIM_MIN || value > DIM_MAX) {
    return err({
      code: "invalid_dim",
      message: `dim must be in [${DIM_MIN}, ${DIM_MAX}]`,
    })
  }
  return ok(brandAs(value))
}

export function isGenerativePreset(value: string): value is GenerativePreset {
  return (GENERATIVE_PRESETS as readonly string[]).includes(value)
}

export type GenerativeWallpaperInput = {
  readonly generativePreset: GenerativePreset
  readonly dim: number
}

export type MediaWallpaperInput = {
  readonly mediaRef: string
  readonly dim: number
}

export function createGenerativeWallpaper(
  input: GenerativeWallpaperInput,
): Result<Wallpaper, WallpaperParseError> {
  if (!isGenerativePreset(input.generativePreset)) {
    return err({ code: "invalid_preset", message: "unknown generative preset" })
  }
  const dimR = wallpaperDim(input.dim)
  if (!dimR.ok) return dimR
  return ok({
    kind: "generative",
    generativePreset: input.generativePreset,
    dim: dimR.value,
  })
}

export function createImageWallpaper(
  input: MediaWallpaperInput,
): Result<Wallpaper, WallpaperParseError> {
  const refR = mediaRef(input.mediaRef)
  if (!refR.ok) return refR
  const dimR = wallpaperDim(input.dim)
  if (!dimR.ok) return dimR
  return ok({ kind: "image", mediaRef: refR.value, dim: dimR.value })
}

export function createVideoWallpaper(
  input: MediaWallpaperInput,
): Result<Wallpaper, WallpaperParseError> {
  const refR = mediaRef(input.mediaRef)
  if (!refR.ok) return refR
  const dimR = wallpaperDim(input.dim)
  if (!dimR.ok) return dimR
  return ok({ kind: "video", mediaRef: refR.value, dim: dimR.value })
}
