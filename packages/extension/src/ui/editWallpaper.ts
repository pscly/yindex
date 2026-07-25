import {
  type Result,
  type Wallpaper,
  type WallpaperParseError,
  assertNever,
  createGenerativeWallpaper,
  createImageWallpaper,
  createVideoWallpaper,
} from "@yindex/domain"
import {
  type MediaAsset,
  type MediaStore,
  type MediaStoreError,
  VIDEO_MAX_BYTES,
} from "../wallpaper/mediaStoreTypes"

export type WallpaperImportError = MediaStoreError | WallpaperParseError

export function createStoredWallpaper(
  asset: Pick<MediaAsset, "kind" | "ref">,
  dim: number,
): Result<Wallpaper, WallpaperParseError> {
  switch (asset.kind) {
    case "image":
      return createImageWallpaper({ mediaRef: String(asset.ref), dim })
    case "video":
      return createVideoWallpaper({ mediaRef: String(asset.ref), dim })
    default:
      return assertNever(asset.kind)
  }
}

export function wallpaperWithDim(
  wallpaper: Wallpaper,
  dim: number,
): Result<Wallpaper, WallpaperParseError> {
  switch (wallpaper.kind) {
    case "generative":
      return createGenerativeWallpaper({
        generativePreset: wallpaper.generativePreset,
        dim,
      })
    case "image":
      return createImageWallpaper({ mediaRef: String(wallpaper.mediaRef), dim })
    case "video":
      return createVideoWallpaper({ mediaRef: String(wallpaper.mediaRef), dim })
    default:
      return assertNever(wallpaper)
  }
}

export async function importWallpaperFile(
  store: MediaStore,
  file: File,
  dim: number,
): Promise<Result<Wallpaper, WallpaperImportError>> {
  const imported = await store.importFile(file)
  if (!imported.ok) return imported
  return createStoredWallpaper(imported.value, dim)
}

export function wallpaperImportErrorMessage(
  error: WallpaperImportError,
): string {
  switch (error.code) {
    case "video_too_large":
      return `视频文件不能超过 ${VIDEO_MAX_BYTES / 1024 / 1024} MiB`
    case "unsupported_mime":
      return "仅支持图片或视频文件"
    case "empty_file":
      return "不能导入空文件"
    case "quota_exceeded":
      return "本地壁纸空间不足"
    case "invalid_dim":
    case "invalid_media_ref":
    case "invalid_preset":
    case "invalid_kind":
    case "disk_error":
    case "decode_failed":
    case "not_found":
    case "io_error":
    case "corrupt_asset":
    case "id_collision":
    case "opfs_unsupported":
      return error.message
    default:
      return assertNever(error)
  }
}
