import { describe, expect, test } from "bun:test"
import { createMediaStore, createMemoryFs } from "./mediaStore"
import { makeFile, openStore } from "./mediaStoreTestUtils.test"
import {
  ASSETS_DIR,
  BLOB_NAME,
  COMMIT_NAME,
  ID_ALLOC_MAX_ATTEMPTS,
  META_NAME,
  STORE_DIR,
} from "./mediaStoreTypes"

describe("MediaStore crash metadata and collisions", () => {
  test("corrupt commit marker returns corrupt_asset on list", async () => {
    // Given
    const { fs } = createMemoryFs()
    const opened = await createMediaStore({ fs })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: true })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: true })
    const bad = await assets.getDirectory("media_corrupt", { create: true })
    await (await bad.getFile(BLOB_NAME, { create: true })).writeBytes(
      new Uint8Array([1]),
    )
    await (await bad.getFile(META_NAME, { create: true })).writeBytes(
      new TextEncoder().encode(
        JSON.stringify({
          id: "media_corrupt",
          kind: "image",
          mimeType: "image/png",
          byteLength: 1,
          displayName: "corrupt.png",
          createdAt: 1,
        }),
      ),
    )
    await (await bad.getFile(COMMIT_NAME, { create: true })).writeBytes(
      new TextEncoder().encode("{not-json"),
    )

    // When
    const list = await opened.value.list()

    // Then
    expect(list.ok).toBe(false)
    if (!list.ok) expect(list.error.code).toBe("corrupt_asset")
  })

  test("duplicate injected ids exhaust bounded retries without overwriting", async () => {
    // Given
    let idCalls = 0
    const { store, fs } = await openStore({
      createId: () => {
        idCalls += 1
        return "media_same_id"
      },
    })
    const first = await store.importFile(
      makeFile({
        name: "a.png",
        type: "image/png",
        bytes: new Uint8Array([1, 1]),
      }),
    )
    expect(first.ok).toBe(true)

    // When
    const second = await store.importFile(
      makeFile({
        name: "b.png",
        type: "image/png",
        bytes: new Uint8Array([2, 2]),
      }),
    )

    // Then
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe("id_collision")
    expect(idCalls).toBe(ID_ALLOC_MAX_ATTEMPTS + 1)
    const list = await store.list()
    expect(list.ok).toBe(true)
    if (!list.ok || !first.ok) return
    expect(list.value).toHaveLength(1)
    const read = await store.read(first.value.ref)
    expect(read.ok).toBe(true)
    if (read.ok) {
      expect([...read.value.bytes]).toEqual([0x89, 0x50, 0x4e, 0x47, 1, 1])
    }
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: false })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: false })
    expect((await assets.listEntries()).map((entry) => entry.name)).toEqual([
      "media_same_id",
    ])
  })

  test("public store creation returns opfs_unsupported when OPFS is absent", async () => {
    // Given
    const previousNavigator = globalThis.navigator
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    })

    try {
      // When
      const opened = await createMediaStore()

      // Then
      expect(opened.ok).toBe(false)
      if (!opened.ok) expect(opened.error.code).toBe("opfs_unsupported")
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        value: previousNavigator,
        configurable: true,
      })
    }
  })

  test("invalid injected ids are rejected before creating a storage path", async () => {
    // Given
    const { store, fs } = await openStore({
      createId: () => "../escaped",
    })

    // When
    const imported = await store.importFile(
      makeFile({
        name: "safe.png",
        type: "image/png",
        bytes: new Uint8Array([1]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) expect(imported.error.code).toBe("id_collision")
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: false })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: false })
    expect(await assets.listEntries()).toHaveLength(0)
  })
})
