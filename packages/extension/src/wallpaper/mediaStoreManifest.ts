import { type Result, err, ok } from "@yindex/domain"
import type { FsDirectoryHandle, FsEntry } from "./mediaStoreFsTypes"
import {
  assetFromMeta,
  hasVisibleCommit,
  validateCommittedAsset,
} from "./mediaStoreMeta"
import {
  ASSETS_DIR,
  type MediaAsset,
  type MediaStoreError,
  PENDING_NAME,
  ioError,
  isNotFoundError,
} from "./mediaStoreTypes"

export async function listCommittedAssets(
  assetsDir: FsDirectoryHandle,
): Promise<Result<readonly MediaAsset[], MediaStoreError>> {
  let entries: readonly FsEntry[]
  try {
    entries = await assetsDir.listEntries()
  } catch (error) {
    if (error instanceof Error) return err(ioError("list", error))
    throw error
  }
  const assets: MediaAsset[] = []
  for (const entry of entries) {
    if (entry.kind !== "directory") continue
    let assetDir: FsDirectoryHandle
    try {
      assetDir = await assetsDir.getDirectory(entry.name, { create: false })
      if (!(await hasVisibleCommit(assetDir))) continue
    } catch (error) {
      if (isNotFoundError(error)) continue
      if (error instanceof Error) return err(ioError("list", error))
      throw error
    }
    const meta = await validateCommittedAsset(assetDir, entry.name)
    if (!meta.ok) return meta
    const asset = assetFromMeta(meta.value)
    if (!asset.ok) return asset
    assets.push(asset.value)
  }
  return ok(assets)
}

export async function cleanIncompleteAssets(
  assetsDir: FsDirectoryHandle,
): Promise<Result<void, MediaStoreError>> {
  let entries: readonly FsEntry[]
  try {
    entries = await assetsDir.listEntries()
  } catch (error) {
    if (error instanceof Error) return err(ioError("init", error))
    throw error
  }
  for (const entry of entries) {
    if (entry.kind !== "directory") {
      const removed = await removeStale(assetsDir, entry.name)
      if (!removed.ok) return removed
      continue
    }
    let assetDir: FsDirectoryHandle
    try {
      assetDir = await assetsDir.getDirectory(entry.name, { create: false })
      if (await assetDir.hasEntry(PENDING_NAME)) {
        const removed = await removeStale(assetsDir, entry.name)
        if (!removed.ok) return removed
        continue
      }
      if (!(await hasVisibleCommit(assetDir))) {
        const removed = await removeStale(assetsDir, entry.name)
        if (!removed.ok) return removed
        continue
      }
    } catch (error) {
      if (isNotFoundError(error)) continue
      if (error instanceof Error) return err(ioError("init", error))
      throw error
    }
    const valid = await validateCommittedAsset(assetDir, entry.name)
    if (!valid.ok) return valid
  }
  return ok(undefined)
}

async function removeStale(
  assetsDir: FsDirectoryHandle,
  name: string,
): Promise<Result<void, MediaStoreError>> {
  try {
    await assetsDir.removeEntry(name, { recursive: true })
    return ok(undefined)
  } catch (error) {
    if (!(error instanceof Error)) throw error
    return isNotFoundError(error) ? ok(undefined) : err(ioError("init", error))
  }
}

export async function ensureAssetsDir(
  storeDir: FsDirectoryHandle,
): Promise<Result<FsDirectoryHandle, MediaStoreError>> {
  try {
    return ok(await storeDir.getDirectory(ASSETS_DIR, { create: true }))
  } catch (error) {
    if (error instanceof Error) return err(ioError("init", error))
    throw error
  }
}
