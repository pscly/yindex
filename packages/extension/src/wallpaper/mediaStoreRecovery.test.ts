import { describe, expect, test } from "bun:test"
import { createMediaStore, createMemoryFs } from "./mediaStore"
import { makeFile } from "./mediaStoreTestUtils.test"
import {
  ASSETS_DIR,
  BLOB_NAME,
  COMMIT_NAME,
  META_NAME,
  PENDING_NAME,
  STORE_DIR,
} from "./mediaStoreTypes"

describe("MediaStore interruption recovery", () => {
  test("blob and metadata without commit are invisible and scrubbed on restart", async () => {
    // Given
    const { fs } = createMemoryFs()
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: true })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: true })
    const incomplete = await assets.getDirectory("media_orphan", {
      create: true,
    })
    await (await incomplete.getFile(BLOB_NAME, { create: true })).writeBytes(
      new Uint8Array([1, 2, 3, 4]),
    )
    await (await incomplete.getFile(META_NAME, { create: true })).writeBytes(
      new TextEncoder().encode(
        JSON.stringify({
          id: "media_orphan",
          kind: "image",
          mimeType: "image/png",
          byteLength: 4,
          displayName: "orphan.png",
          createdAt: 1,
        }),
      ),
    )

    // When
    const opened = await createMediaStore({ fs })

    // Then
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
    expect(await assets.listEntries()).toHaveLength(0)
  })

  test("existing asset survives a new import interrupted after its blob write", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    let sequence = 0
    const opened = await createMediaStore({
      fs,
      createId: () => `media_keep_${++sequence}`,
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const kept = await opened.value.importFile(
      makeFile({
        name: "keep.png",
        type: "image/png",
        bytes: new Uint8Array([9, 9]),
      }),
    )
    expect(kept.ok).toBe(true)
    controls.failWriteAttemptWithIo = controls.writeAttempts + 3

    // When
    const interrupted = await opened.value.importFile(
      makeFile({
        name: "interrupted.png",
        type: "image/png",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    )

    // Then
    expect(interrupted.ok).toBe(false)
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (!list.ok) return
    expect(list.value.map((asset) => asset.displayName)).toEqual(["keep.png"])
  })

  test("failed cleanup is typed, keeps asset invisible, and restart scrubs it", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_cleanup_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failCloseAttemptWithIo = controls.writeAttempts + 4
    controls.failNextRemoveWithIo = true

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "cleanup.png",
        type: "image/png",
        bytes: new Uint8Array([4, 5, 6]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("io_error")
      if (imported.error.code === "io_error") {
        expect(imported.error.operation).toBe("cleanup")
      }
    }
    const beforeRestart = await opened.value.list()
    expect(beforeRestart.ok).toBe(true)
    if (beforeRestart.ok) expect(beforeRestart.value).toHaveLength(0)
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: false })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: false })
    const failedAsset = await assets.getDirectory("media_cleanup_fail", {
      create: false,
    })
    expect(await failedAsset.hasEntry(PENDING_NAME)).toBe(true)
    const restarted = await createMediaStore({ fs })
    expect(restarted.ok).toBe(true)
    if (!restarted.ok) return
    const afterRestart = await restarted.value.list()
    expect(afterRestart.ok).toBe(true)
    if (afterRestart.ok) expect(afterRestart.value).toHaveLength(0)
  })

  test("restart scrubs an asset interrupted after commit but before finalization", async () => {
    // Given
    const { fs } = createMemoryFs()
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: true })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: true })
    const partial = await assets.getDirectory("media_pending_commit", {
      create: true,
    })
    await (await partial.getFile(PENDING_NAME, { create: true })).writeBytes(
      new Uint8Array([1]),
    )
    await (await partial.getFile(BLOB_NAME, { create: true })).writeBytes(
      new Uint8Array([7]),
    )
    await (await partial.getFile(META_NAME, { create: true })).writeBytes(
      new TextEncoder().encode(
        JSON.stringify({
          id: "media_pending_commit",
          kind: "image",
          mimeType: "image/png",
          byteLength: 1,
          displayName: "pending.png",
          createdAt: 1,
        }),
      ),
    )
    await (await partial.getFile(COMMIT_NAME, { create: true })).writeBytes(
      new Uint8Array([1]),
    )

    // When
    const opened = await createMediaStore({ fs })

    // Then
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
    expect(await assets.listEntries()).toHaveLength(0)
  })

  test("finalization failure leaves a pending asset invisible until restart", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_finalize_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failNextRemoveWithIo = true

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "finalize.png",
        type: "image/png",
        bytes: new Uint8Array([8, 8]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("io_error")
      if (imported.error.code === "io_error") {
        expect(imported.error.operation).toBe("cleanup")
      }
    }
    const beforeRestart = await opened.value.list()
    expect(beforeRestart.ok).toBe(true)
    if (beforeRestart.ok) expect(beforeRestart.value).toHaveLength(0)
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: false })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: false })
    const pending = await assets.getDirectory("media_finalize_fail", {
      create: false,
    })
    expect(await pending.hasEntry(PENDING_NAME)).toBe(true)

    const restarted = await createMediaStore({ fs })
    expect(restarted.ok).toBe(true)
    expect(await assets.listEntries()).toHaveLength(0)
  })

  test("stale cleanup failure aborts store initialization deterministically", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: true })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: true })
    await assets.getDirectory("media_stale", { create: true })
    controls.failNextRemoveWithIo = true

    // When
    const opened = await createMediaStore({ fs })

    // Then
    expect(opened.ok).toBe(false)
    if (!opened.ok) {
      expect(opened.error.code).toBe("io_error")
      if (opened.error.code === "io_error") {
        expect(opened.error.operation).toBe("init")
      }
    }
  })
})
