/**
 * Local Wallpaper media store (OPFS bytes + crash-consistent per-asset commit).
 * Layout: store/assets/{id}/{blob, meta.json, commit}. Commit file written last.
 * Consumers: WallpaperStage (read → object URL), Settings WS6 (list/delete/capacity).
 */
import { type Result, err, ok } from "@yindex/domain"
import type { MediaFs } from "./mediaStoreFs"
import type { FsDirectoryHandle } from "./mediaStoreFsTypes"
import { importFile } from "./mediaStoreImport"
import {
  cleanIncompleteAssets,
  ensureAssetsDir,
  listCommittedAssets,
} from "./mediaStoreManifest"
import { createOpfsMediaFs } from "./mediaStoreOpfs"
import { capacityFromAssets, deleteAsset, readAsset } from "./mediaStoreOps"
import {
  type MediaStore,
  type MediaStoreError,
  STORE_DIR,
  ioError,
  newAssetId,
} from "./mediaStoreTypes"

export type {
  MediaAsset,
  MediaBlob,
  MediaCapacity,
  MediaKind,
  MediaStore,
  MediaStoreError,
} from "./mediaStoreTypes"
export {
  ASSETS_DIR,
  BLOB_NAME,
  COMMIT_NAME,
  META_NAME,
  PENDING_NAME,
  STORE_DIR,
  VIDEO_MAX_BYTES,
} from "./mediaStoreTypes"
export { createMemoryFs } from "./mediaStoreFs"
export { createOpfsMediaFs } from "./mediaStoreOpfs"
export type { MediaFs, MemoryFsControls } from "./mediaStoreFs"

export type CreateMediaStoreOptions = {
  readonly fs?: MediaFs
  readonly now?: () => number
  readonly createId?: () => string
}

export async function createMediaStore(
  options: CreateMediaStoreOptions = {},
): Promise<Result<MediaStore, MediaStoreError>> {
  let fs: MediaFs
  if (options.fs !== undefined) {
    fs = options.fs
  } else {
    try {
      fs = await createOpfsMediaFs()
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotSupportedError") {
        return err({
          code: "opfs_unsupported",
          message: e.message,
        })
      }
      return err(ioError("init", e))
    }
  }
  const now = options.now ?? (() => Date.now())
  const createId = options.createId ?? newAssetId

  let storeDir: FsDirectoryHandle
  try {
    storeDir = await fs.root.getDirectory(STORE_DIR, { create: true })
  } catch (error) {
    if (error instanceof Error) return err(ioError("init", error))
    throw error
  }

  const assetsR = await ensureAssetsDir(storeDir)
  if (!assetsR.ok) return assetsR
  const assetsDir = assetsR.value

  const cleaned = await cleanIncompleteAssets(assetsDir)
  if (!cleaned.ok) return cleaned

  let importQueue: Promise<void> = Promise.resolve()

  const store: MediaStore = {
    async importFile(file) {
      const imported = importQueue.then(() =>
        importFile({
          file,
          assetsDir,
          createId,
          now,
        }),
      )
      importQueue = imported.then(
        () => undefined,
        () => undefined,
      )
      return imported
    },

    async list() {
      return listCommittedAssets(assetsDir)
    },

    async read(ref) {
      return readAsset({ ref, assetsDir })
    },

    async delete(ref) {
      return deleteAsset({ ref, assetsDir })
    },

    async capacity() {
      return capacityFromAssets({
        assetsDir,
        estimate: () => fs.estimate(),
      })
    },
  }

  return ok(store)
}
