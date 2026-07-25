import { type Result, assertNever, err } from "@yindex/domain"
import {
  contentHash,
  isSupportedVideoFilename,
  validateMediaFile,
} from "./mediaStoreFileValidation"
import type { FsDirectoryHandle } from "./mediaStoreFs"
import { assetFromMeta } from "./mediaStoreMeta"
import {
  type AssetMeta,
  BLOB_NAME,
  COMMIT_NAME,
  META_NAME,
  type MediaAsset,
  type MediaStoreError,
  PENDING_NAME,
  VIDEO_MAX_BYTES,
  ioError,
} from "./mediaStoreTypes"
import {
  allocateId,
  finalizeAsset,
  mapWriteFailure,
  removeAssetDir,
  writeBytesMapped,
} from "./mediaStoreWrite"

export async function importFile(input: {
  readonly file: File
  readonly assetsDir: FsDirectoryHandle
  readonly createId: () => string
  readonly now: () => number
}): Promise<Result<MediaAsset, MediaStoreError>> {
  if (input.file.size === 0) {
    return err({ code: "empty_file", message: "file is empty" })
  }
  if (
    input.file.size > VIDEO_MAX_BYTES &&
    isSupportedVideoFilename(input.file.name)
  ) {
    return err({
      code: "video_too_large",
      byteLength: input.file.size,
      maxBytes: VIDEO_MAX_BYTES,
      message: `video exceeds ${VIDEO_MAX_BYTES} byte limit`,
    })
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await input.file.arrayBuffer())
  } catch (error) {
    if (error instanceof Error) return err(ioError("read", error))
    throw error
  }
  const validated = validateMediaFile({
    name: input.file.name,
    declaredMimeType: input.file.type,
    bytes,
  })
  if (!validated.ok) return validated
  const { kind, mimeType } = validated.value
  switch (kind) {
    case "video":
      break
    case "image":
      break
    default:
      return assertNever(kind)
  }

  const idResult = await allocateId(input.assetsDir, input.createId)
  if (!idResult.ok) return idResult
  const id = idResult.value

  let assetDir: FsDirectoryHandle
  try {
    assetDir = await input.assetsDir.getDirectory(id, { create: true })
  } catch (error) {
    if (error instanceof Error) return err(mapWriteFailure(error))
    throw error
  }

  const pendingWrite = await writeBytesMapped(
    assetDir,
    PENDING_NAME,
    new Uint8Array([1]),
  )
  if (!pendingWrite.ok) {
    const cleanup = await removeAssetDir(input.assetsDir, id)
    if (!cleanup.ok) return cleanup
    return pendingWrite
  }

  const blobWrite = await writeBytesMapped(assetDir, BLOB_NAME, bytes)
  if (!blobWrite.ok) {
    const cleanup = await removeAssetDir(input.assetsDir, id)
    if (!cleanup.ok) return cleanup
    return blobWrite
  }

  const meta: AssetMeta = {
    id,
    kind,
    mimeType,
    byteLength: bytes.byteLength,
    contentHash: await contentHash(bytes),
    displayName: input.file.name || id,
    createdAt: input.now(),
  }
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta))
  const metaWrite = await writeBytesMapped(assetDir, META_NAME, metaBytes)
  if (!metaWrite.ok) {
    const cleanup = await removeAssetDir(input.assetsDir, id)
    if (!cleanup.ok) return cleanup
    return metaWrite
  }

  const commitWrite = await writeBytesMapped(
    assetDir,
    COMMIT_NAME,
    new Uint8Array([1]),
  )
  if (!commitWrite.ok) {
    const cleanup = await removeAssetDir(input.assetsDir, id)
    if (!cleanup.ok) return cleanup
    return commitWrite
  }

  const finalized = await finalizeAsset(assetDir)
  if (!finalized.ok) return finalized

  return assetFromMeta(meta)
}
