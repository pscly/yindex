import { describe, expect, test } from "bun:test"
import { createMediaStore, createMemoryFs } from "./mediaStore"
import { makeFile } from "./mediaStoreTestUtils.test"
import {
  ASSETS_DIR,
  BLOB_NAME,
  COMMIT_NAME,
  META_NAME,
  STORE_DIR,
} from "./mediaStoreTypes"

async function plantCommittedAsset(input: {
  readonly fs: ReturnType<typeof createMemoryFs>["fs"]
  readonly id: string
  readonly declaredBytes: number
  readonly blobBytes?: Uint8Array
  readonly commitBytes?: Uint8Array
}): Promise<void> {
  const storeDir = await input.fs.root.getDirectory(STORE_DIR, { create: true })
  const assets = await storeDir.getDirectory(ASSETS_DIR, { create: true })
  const asset = await assets.getDirectory(input.id, { create: true })
  if (input.blobBytes !== undefined) {
    await (await asset.getFile(BLOB_NAME, { create: true })).writeBytes(
      input.blobBytes,
    )
  }
  await (await asset.getFile(META_NAME, { create: true })).writeBytes(
    new TextEncoder().encode(
      JSON.stringify({
        id: input.id,
        kind: "image",
        mimeType: "image/png",
        byteLength: input.declaredBytes,
        displayName: "integrity.png",
        createdAt: 1,
      }),
    ),
  )
  await (await asset.getFile(COMMIT_NAME, { create: true })).writeBytes(
    input.commitBytes ?? new Uint8Array([1]),
  )
}

describe("MediaStore committed asset integrity", () => {
  test("read rejects same-length blob corruption after import", async () => {
    // Given
    const { fs } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_hash_corrupt",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const imported = await opened.value.importFile(
      makeFile({
        name: "hash.png",
        type: "image/png",
        bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      }),
    )
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    const storeDir = await fs.root.getDirectory(STORE_DIR, { create: false })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: false })
    const asset = await assets.getDirectory("media_hash_corrupt", {
      create: false,
    })
    await (await asset.getFile(BLOB_NAME, { create: false })).writeBytes(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9, 9, 9]),
    )

    // When
    const read = await opened.value.read(imported.value.ref)

    // Then
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.error.code).toBe("corrupt_asset")
  })

  test("startup reports committed metadata whose blob is missing", async () => {
    // Given
    const { fs } = createMemoryFs()
    await plantCommittedAsset({
      fs,
      id: "media_missing_blob",
      declaredBytes: 2,
    })
    const opened = await createMediaStore({ fs })
    expect(opened.ok).toBe(false)
    if (!opened.ok) expect(opened.error.code).toBe("corrupt_asset")
  })

  test("startup reports a committed blob whose length mismatches metadata", async () => {
    // Given
    const { fs } = createMemoryFs()
    await plantCommittedAsset({
      fs,
      id: "media_wrong_size",
      declaredBytes: 3,
      blobBytes: new Uint8Array([1, 2]),
    })
    const opened = await createMediaStore({ fs })
    expect(opened.ok).toBe(false)
    if (!opened.ok) expect(opened.error.code).toBe("corrupt_asset")
  })

  test("corrupt committed state is surfaced during startup", async () => {
    // Given
    const { fs } = createMemoryFs()
    await plantCommittedAsset({
      fs,
      id: "media_bad_startup_commit",
      declaredBytes: 1,
      blobBytes: new Uint8Array([1]),
      commitBytes: new Uint8Array([2]),
    })

    // When
    const opened = await createMediaStore({ fs })

    // Then
    expect(opened.ok).toBe(false)
    if (!opened.ok) expect(opened.error.code).toBe("corrupt_asset")
  })
})
