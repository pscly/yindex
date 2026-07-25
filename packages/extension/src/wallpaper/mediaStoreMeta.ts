import { type MediaRef, type Result, err, mediaRef, ok } from "@yindex/domain"
import { contentHash } from "./mediaStoreFileValidation"
import type { FsDirectoryHandle } from "./mediaStoreFsTypes"
import {
  type AssetMeta,
  BLOB_NAME,
  COMMIT_NAME,
  META_NAME,
  type MediaAsset,
  type MediaKind,
  type MediaStoreError,
  PENDING_NAME,
  VIDEO_MAX_BYTES,
  classifyMime,
  ioError,
  isNotFoundError,
} from "./mediaStoreTypes"

function hasProperty<K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> {
  return key in value
}

export function isAssetId(id: string): boolean {
  return /^media_[A-Za-z0-9_-]{1,200}$/.test(id)
}

export function parseAssetMeta(
  text: string,
): Result<AssetMeta, MediaStoreError> {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    return err({
      code: "corrupt_asset",
      message: error instanceof Error ? error.message : String(error),
    })
  }
  if (
    typeof raw !== "object" ||
    raw === null ||
    !hasProperty(raw, "id") ||
    !hasProperty(raw, "kind") ||
    !hasProperty(raw, "mimeType") ||
    !hasProperty(raw, "byteLength") ||
    !hasProperty(raw, "contentHash") ||
    !hasProperty(raw, "displayName") ||
    !hasProperty(raw, "createdAt")
  ) {
    return err({ code: "corrupt_asset", message: "asset fields missing" })
  }
  if (
    typeof raw.id !== "string" ||
    !isAssetId(raw.id) ||
    typeof raw.mimeType !== "string" ||
    typeof raw.byteLength !== "number" ||
    !Number.isSafeInteger(raw.byteLength) ||
    raw.byteLength <= 0 ||
    typeof raw.contentHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(raw.contentHash) ||
    typeof raw.displayName !== "string" ||
    raw.displayName.length === 0 ||
    typeof raw.createdAt !== "number" ||
    !Number.isFinite(raw.createdAt)
  ) {
    return err({ code: "corrupt_asset", message: "asset fields invalid" })
  }
  const kind = parseKind(raw.kind)
  if (kind === null || classifyMime(raw.mimeType) !== kind) {
    return err({ code: "corrupt_asset", message: "asset kind or MIME invalid" })
  }
  if (kind === "video" && raw.byteLength > VIDEO_MAX_BYTES) {
    return err({ code: "corrupt_asset", message: "stored video exceeds limit" })
  }
  return ok({
    id: raw.id,
    kind,
    mimeType: raw.mimeType,
    byteLength: raw.byteLength,
    contentHash: raw.contentHash,
    displayName: raw.displayName,
    createdAt: raw.createdAt,
  })
}

function parseKind(value: unknown): MediaKind | null {
  if (value === "image") return "image"
  if (value === "video") return "video"
  return null
}

export function assetFromMeta(
  meta: AssetMeta,
): Result<MediaAsset, MediaStoreError> {
  const refResult = refFromId(meta.id)
  if (!refResult.ok) return refResult
  return ok({
    ref: refResult.value,
    kind: meta.kind,
    mimeType: meta.mimeType,
    byteLength: meta.byteLength,
    displayName: meta.displayName,
    createdAt: meta.createdAt,
  })
}

function refFromId(id: string): Result<MediaRef, MediaStoreError> {
  const result = mediaRef(id)
  return result.ok
    ? ok(result.value)
    : err({ code: "corrupt_asset", message: result.error.message })
}

export async function hasCommit(assetDir: FsDirectoryHandle): Promise<boolean> {
  try {
    return await (
      await assetDir.getFile(COMMIT_NAME, { create: false })
    ).existsWithData()
  } catch (error) {
    if (isNotFoundError(error)) return false
    throw error
  }
}

export async function hasVisibleCommit(
  assetDir: FsDirectoryHandle,
): Promise<boolean> {
  return !(await assetDir.hasEntry(PENDING_NAME)) && (await hasCommit(assetDir))
}

export async function validateCommittedAsset(
  assetDir: FsDirectoryHandle,
  id: string,
): Promise<Result<AssetMeta, MediaStoreError>> {
  try {
    const commit = await assetDir.getFile(COMMIT_NAME, { create: false })
    const commitBytes = await commit.readBytes()
    if (commitBytes.byteLength !== 1 || commitBytes[0] !== 1) {
      return err({ code: "corrupt_asset", message: "commit marker invalid" })
    }
    const metaFile = await assetDir.getFile(META_NAME, { create: false })
    const meta = parseAssetMeta(
      new TextDecoder().decode(await metaFile.readBytes()),
    )
    if (!meta.ok) return meta
    if (meta.value.id !== id) {
      return err({ code: "corrupt_asset", message: "asset id mismatch" })
    }
    const blob = await assetDir.getFile(BLOB_NAME, { create: false })
    const blobBytes = await blob.readBytes()
    if (blobBytes.byteLength !== meta.value.byteLength) {
      return err({ code: "corrupt_asset", message: "asset size mismatch" })
    }
    if ((await contentHash(blobBytes)) !== meta.value.contentHash) {
      return err({
        code: "corrupt_asset",
        message: "asset content hash mismatch",
      })
    }
    return meta
  } catch (error) {
    if (isNotFoundError(error)) {
      return err({
        code: "corrupt_asset",
        message: "committed asset incomplete",
      })
    }
    if (error instanceof Error) return err(ioError("read", error))
    throw error
  }
}
