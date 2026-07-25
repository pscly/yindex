import type { MediaRef, Result } from "@yindex/domain"

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024
export const STORE_DIR = "yindex-wallpaper-media"
export const ASSETS_DIR = "assets"
export const BLOB_NAME = "blob"
export const META_NAME = "meta.json"
export const COMMIT_NAME = "commit"
export const PENDING_NAME = "pending"
export const ID_ALLOC_ATTEMPTS = 8
export const ID_ALLOC_MAX_ATTEMPTS = ID_ALLOC_ATTEMPTS
export const META_BUDGET_BYTES = 1024 * 1024

export type MediaKind = "image" | "video"

export type MediaAsset = {
  readonly ref: MediaRef
  readonly kind: MediaKind
  readonly mimeType: string
  readonly byteLength: number
  readonly displayName: string
  readonly createdAt: number
}

export type MediaCapacity = {
  readonly usedBytes: number
  readonly quotaBytes: number | null
  readonly assetCount: number
  readonly assetBytes: number
}

export type MediaBlob = {
  readonly ref: MediaRef
  readonly kind: MediaKind
  readonly mimeType: string
  readonly bytes: Uint8Array
  readonly byteLength: number
}

export type MediaStoreError =
  | {
      readonly code: "unsupported_mime"
      readonly mimeType: string
      readonly message: string
    }
  | {
      readonly code: "empty_file"
      readonly message: string
    }
  | {
      readonly code: "video_too_large"
      readonly byteLength: number
      readonly maxBytes: number
      readonly message: string
    }
  | {
      readonly code: "quota_exceeded"
      readonly message: string
    }
  | {
      readonly code: "disk_error"
      readonly operation: "write" | "close" | "abort"
      readonly message: string
    }
  | {
      readonly code: "decode_failed"
      readonly mimeType: string
      readonly message: string
    }
  | {
      readonly code: "not_found"
      readonly ref: MediaRef
      readonly message: string
    }
  | {
      readonly code: "io_error"
      readonly operation:
        | "write"
        | "read"
        | "delete"
        | "cleanup"
        | "init"
        | "list"
        | "close"
        | "abort"
      readonly message: string
    }
  | {
      readonly code: "corrupt_asset"
      readonly message: string
    }
  | {
      readonly code: "id_collision"
      readonly message: string
    }
  | {
      readonly code: "opfs_unsupported"
      readonly message: string
    }

export type MediaStore = {
  /** Validates extension, declared MIME, signature, size, then commits bytes atomically. */
  importFile(file: File): Promise<Result<MediaAsset, MediaStoreError>>
  /** Lists only fully closed, committed, integrity-checked assets. */
  list(): Promise<Result<readonly MediaAsset[], MediaStoreError>>
  /** Returns immutable bytes for WallpaperStage object-URL creation. */
  read(ref: MediaRef): Promise<Result<MediaBlob, MediaStoreError>>
  /** Permanently removes one committed asset; reference guards belong to Settings. */
  delete(ref: MediaRef): Promise<Result<void, MediaStoreError>>
  /** Reports origin usage/quota plus committed Wallpaper media totals. */
  capacity(): Promise<Result<MediaCapacity, MediaStoreError>>
}

export type AssetMeta = {
  readonly id: string
  readonly kind: MediaKind
  readonly mimeType: string
  readonly byteLength: number
  readonly contentHash: string
  readonly displayName: string
  readonly createdAt: number
}

const IMAGE_PREFIX = "image/"
const VIDEO_PREFIX = "video/"

export function classifyMime(mimeType: string): MediaKind | null {
  if (
    mimeType.startsWith(IMAGE_PREFIX) &&
    mimeType.length > IMAGE_PREFIX.length
  ) {
    return "image"
  }
  if (
    mimeType.startsWith(VIDEO_PREFIX) &&
    mimeType.length > VIDEO_PREFIX.length
  ) {
    return "video"
  }
  return null
}

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "QuotaExceededError"
}

export function isNotFoundError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "NotFoundError"
}

export function ioError(
  operation:
    | "write"
    | "read"
    | "delete"
    | "cleanup"
    | "init"
    | "list"
    | "close"
    | "abort",
  e: unknown,
): MediaStoreError {
  const message = e instanceof Error ? e.message : String(e)
  return { code: "io_error", operation, message }
}

export function newAssetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `media_${crypto.randomUUID()}`
  }
  return `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}
