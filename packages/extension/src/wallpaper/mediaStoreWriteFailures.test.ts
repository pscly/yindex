import { describe, expect, test } from "bun:test"
import { createMediaStore, createMemoryFs } from "./mediaStore"
import { makeFile } from "./mediaStoreTestUtils.test"

describe("MediaStore writer failures", () => {
  test("blob write failure is typed and leaves no visible asset", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_blob_write_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failWriteAttemptWithIo = controls.writeAttempts + 2

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "write.png",
        type: "image/png",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("disk_error")
      if (imported.error.code === "disk_error") {
        expect(imported.error.operation).toBe("write")
      }
    }
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
  })

  test("metadata write interruption is typed and cleaned", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_meta_write_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failWriteAttemptWithIo = controls.writeAttempts + 3

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "meta.png",
        type: "image/png",
        bytes: new Uint8Array([4, 5]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("disk_error")
      if (imported.error.code === "disk_error") {
        expect(imported.error.operation).toBe("write")
      }
    }
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
  })

  test("commit write interruption is typed and cleaned", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_commit_write_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failWriteAttemptWithIo = controls.writeAttempts + 4

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "commit.png",
        type: "image/png",
        bytes: new Uint8Array([6, 7]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("disk_error")
      if (imported.error.code === "disk_error") {
        expect(imported.error.operation).toBe("write")
      }
    }
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
  })

  test("write plus abort failure reports abort and leaves no visible asset", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_abort_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failWriteAttemptWithIo = controls.writeAttempts + 2
    controls.failNextAbortWithIo = true

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "abort.png",
        type: "image/png",
        bytes: new Uint8Array([8, 9]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("disk_error")
      if (imported.error.code === "disk_error") {
        expect(imported.error.operation).toBe("abort")
      }
    }
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
  })

  test("commit close failure reports close and leaves no visible asset", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_commit_close_fail",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failCloseAttemptWithIo = controls.writeAttempts + 4

    // When
    const imported = await opened.value.importFile(
      makeFile({
        name: "close.png",
        type: "image/png",
        bytes: new Uint8Array([10]),
      }),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("disk_error")
      if (imported.error.code === "disk_error") {
        expect(imported.error.operation).toBe("close")
      }
    }
    const list = await opened.value.list()
    expect(list.ok).toBe(true)
    if (list.ok) expect(list.value).toHaveLength(0)
  })
})
