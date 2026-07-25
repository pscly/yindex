import { type Result, err, ok } from "@yindex/domain"
import { type FsDirectoryHandle, FsWriteError } from "./mediaStoreFsTypes"
import { isAssetId } from "./mediaStoreMeta"
import {
  ID_ALLOC_MAX_ATTEMPTS,
  type MediaStoreError,
  PENDING_NAME,
  ioError,
  isNotFoundError,
  isQuotaError,
} from "./mediaStoreTypes"

export function mapWriteFailure(e: unknown): MediaStoreError {
  if (isQuotaError(e)) {
    return { code: "quota_exceeded", message: "storage quota exceeded" }
  }
  if (e instanceof FsWriteError) {
    return { code: "disk_error", operation: e.operation, message: e.message }
  }
  return {
    code: "disk_error",
    operation: "write",
    message: e instanceof Error ? e.message : String(e),
  }
}

export async function assetDirExists(
  assetsDir: FsDirectoryHandle,
  id: string,
): Promise<boolean> {
  if (typeof assetsDir.hasEntry === "function") {
    return assetsDir.hasEntry(id)
  }
  try {
    await assetsDir.getDirectory(id, { create: false })
    return true
  } catch (e) {
    if (isNotFoundError(e)) return false
    throw e
  }
}

export async function allocateId(
  assetsDir: FsDirectoryHandle,
  createId: () => string,
): Promise<Result<string, MediaStoreError>> {
  for (let attempt = 0; attempt < ID_ALLOC_MAX_ATTEMPTS; attempt++) {
    const id = createId()
    if (!isAssetId(id)) continue
    let exists: boolean
    try {
      exists = await assetDirExists(assetsDir, id)
    } catch (e) {
      if (e instanceof Error) return err(ioError("write", e))
      throw e
    }
    if (!exists) return ok(id)
  }
  return err({
    code: "id_collision",
    message: `could not allocate unique asset id after ${ID_ALLOC_MAX_ATTEMPTS} attempts`,
  })
}

export async function writeBytesMapped(
  dir: FsDirectoryHandle,
  name: string,
  bytes: Uint8Array,
): Promise<Result<void, MediaStoreError>> {
  try {
    const file = await dir.getFile(name, { create: true })
    await file.writeBytes(bytes)
    return ok(undefined)
  } catch (e) {
    if (e instanceof Error) return err(mapWriteFailure(e))
    throw e
  }
}

export async function removeAssetDir(
  assetsDir: FsDirectoryHandle,
  id: string,
): Promise<Result<void, MediaStoreError>> {
  try {
    await assetsDir.removeEntry(id, { recursive: true })
    return ok(undefined)
  } catch (e) {
    if (isNotFoundError(e)) return ok(undefined)
    if (e instanceof Error) return err(ioError("cleanup", e))
    throw e
  }
}

export async function finalizeAsset(
  assetDir: FsDirectoryHandle,
): Promise<Result<void, MediaStoreError>> {
  try {
    await assetDir.removeEntry(PENDING_NAME)
    return ok(undefined)
  } catch (error) {
    if (isNotFoundError(error)) return ok(undefined)
    if (error instanceof Error) return err(ioError("cleanup", error))
    throw error
  }
}
