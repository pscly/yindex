import type { MediaRef, Result } from "@yindex/domain"
import { createMediaStore } from "./mediaStore"
import type { MediaBlob, MediaKind, MediaStoreError } from "./mediaStoreTypes"

export type WallpaperMediaUrlLease = {
  readonly blob: Blob
  readonly contentHash: string
  readonly url: string
  release(): void
}

type MediaReader = (
  ref: MediaRef,
) => Promise<Result<MediaBlob, MediaStoreError>>

type PoolDependencies = {
  readonly read: MediaReader
  readonly createObjectUrl: (blob: Blob) => string
  readonly revokeObjectUrl: (url: string) => void
}

type SharedMedia = {
  readonly blob: Blob
  readonly contentHash: string
  readonly url: string
}

type PoolEntry = {
  users: number
  readonly pending: Promise<SharedMedia | null>
}

export type WallpaperMediaUrlPool = {
  acquire(
    ref: MediaRef,
    expectedKind: MediaKind,
  ): Promise<WallpaperMediaUrlLease | null>
}

export function createWallpaperMediaUrlPool(
  dependencies: PoolDependencies,
): WallpaperMediaUrlPool {
  const entries = new Map<string, PoolEntry>()

  return {
    async acquire(ref, expectedKind) {
      const key = `${String(ref)}:${expectedKind}`
      let entry = entries.get(key)
      if (entry === undefined) {
        const pending = dependencies.read(ref).then((result) => {
          if (!result.ok || result.value.kind !== expectedKind) return null
          const buffer = new ArrayBuffer(result.value.byteLength)
          new Uint8Array(buffer).set(result.value.bytes)
          const blob = new Blob([buffer], {
            type: result.value.mimeType,
          })
          return {
            blob,
            contentHash: result.value.contentHash,
            url: dependencies.createObjectUrl(blob),
          }
        })
        entry = { users: 0, pending }
        entries.set(key, entry)
      }
      entry.users += 1
      const shared = await entry.pending
      if (shared === null) {
        entry.users -= 1
        if (entry.users === 0 && entries.get(key) === entry) entries.delete(key)
        return null
      }

      let active = true
      return {
        ...shared,
        release() {
          if (!active) return
          active = false
          entry.users -= 1
          if (entry.users !== 0 || entries.get(key) !== entry) return
          entries.delete(key)
          dependencies.revokeObjectUrl(shared.url)
        },
      }
    },
  }
}

let storeResult: ReturnType<typeof createMediaStore> | undefined

const productionPool = createWallpaperMediaUrlPool({
  read: async (ref) => {
    storeResult ??= createMediaStore()
    const opened = await storeResult
    return opened.ok ? opened.value.read(ref) : opened
  },
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
})

export function wallpaperMediaUrlPool(): WallpaperMediaUrlPool {
  return productionPool
}
