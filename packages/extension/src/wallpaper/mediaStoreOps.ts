import { type MediaRef, type Result, err, ok } from "@yindex/domain"
import type { FsDirectoryHandle } from "./mediaStoreFs"
import { listCommittedAssets } from "./mediaStoreManifest"
import { hasVisibleCommit, validateCommittedAsset } from "./mediaStoreMeta"
import {
  BLOB_NAME,
  type MediaBlob,
  type MediaCapacity,
  type MediaStoreError,
  ioError,
  isNotFoundError,
} from "./mediaStoreTypes"

export async function readAsset(input: {
  readonly ref: MediaRef
  readonly assetsDir: FsDirectoryHandle
}): Promise<Result<MediaBlob, MediaStoreError>> {
  const id = String(input.ref)
  let assetDir: FsDirectoryHandle
  try {
    assetDir = await input.assetsDir.getDirectory(id, { create: false })
  } catch (e) {
    if (isNotFoundError(e)) {
      return err({
        code: "not_found",
        ref: input.ref,
        message: "media asset not found",
      })
    }
    if (e instanceof Error) return err(ioError("read", e))
    throw e
  }

  let committed: boolean
  try {
    committed = await hasVisibleCommit(assetDir)
  } catch (e) {
    if (e instanceof Error) return err(ioError("read", e))
    throw e
  }
  if (!committed) {
    return err({
      code: "not_found",
      ref: input.ref,
      message: "media asset not committed",
    })
  }

  const metaR = await validateCommittedAsset(assetDir, id)
  if (!metaR.ok) return metaR

  try {
    const file = await assetDir.getFile(BLOB_NAME, { create: false })
    const blobBytes = await file.readBytes()
    if (blobBytes.byteLength !== metaR.value.byteLength) {
      return err({
        code: "corrupt_asset",
        message: "media blob length does not match meta",
      })
    }
    return ok({
      ref: input.ref,
      kind: metaR.value.kind,
      mimeType: metaR.value.mimeType,
      bytes: blobBytes,
      byteLength: blobBytes.byteLength,
    })
  } catch (e) {
    if (isNotFoundError(e)) {
      return err({
        code: "not_found",
        ref: input.ref,
        message: "media blob missing from store",
      })
    }
    if (e instanceof Error) return err(ioError("read", e))
    throw e
  }
}

export async function deleteAsset(input: {
  readonly ref: MediaRef
  readonly assetsDir: FsDirectoryHandle
}): Promise<Result<void, MediaStoreError>> {
  const id = String(input.ref)
  let assetDir: FsDirectoryHandle
  try {
    assetDir = await input.assetsDir.getDirectory(id, { create: false })
  } catch (e) {
    if (isNotFoundError(e)) {
      return err({
        code: "not_found",
        ref: input.ref,
        message: "media asset not found",
      })
    }
    if (e instanceof Error) return err(ioError("delete", e))
    throw e
  }

  let committed: boolean
  try {
    committed = await hasVisibleCommit(assetDir)
  } catch (e) {
    if (e instanceof Error) return err(ioError("delete", e))
    throw e
  }
  if (!committed) {
    return err({
      code: "not_found",
      ref: input.ref,
      message: "media asset not found",
    })
  }

  try {
    await input.assetsDir.removeEntry(id, { recursive: true })
    return ok(undefined)
  } catch (e) {
    if (isNotFoundError(e)) {
      return err({
        code: "not_found",
        ref: input.ref,
        message: "media asset not found",
      })
    }
    if (e instanceof Error) return err(ioError("delete", e))
    throw e
  }
}

export async function capacityFromAssets(input: {
  readonly assetsDir: FsDirectoryHandle
  readonly estimate: () => Promise<{
    readonly usage: number
    readonly quota: number | null
  }>
}): Promise<Result<MediaCapacity, MediaStoreError>> {
  const listR = await listCommittedAssets(input.assetsDir)
  if (!listR.ok) return listR
  let assetBytes = 0
  for (const a of listR.value) assetBytes += a.byteLength
  try {
    const est = await input.estimate()
    return ok({
      usedBytes: est.usage,
      quotaBytes: est.quota,
      assetCount: listR.value.length,
      assetBytes,
    })
  } catch (e) {
    if (e instanceof Error) return err(ioError("list", e))
    throw e
  }
}
