import { describe, expect, test } from "bun:test"
import { createMediaStore, createMemoryFs } from "./mediaStore"

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

function file(name: string, type: string, bytes: Uint8Array): File {
  return new File([bytes], name, { type })
}

describe("MediaStore file trust boundary", () => {
  test("imports supported media when File.type is absent but extension and bytes agree", async () => {
    // Given
    const opened = await createMediaStore({
      fs: createMemoryFs().fs,
      createId: () => "media_empty_type",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    // When
    const imported = await opened.value.importFile(
      file("wall.png", "", PNG_BYTES),
    )

    // Then
    expect(imported.ok).toBe(true)
    if (imported.ok) expect(imported.value.mimeType).toBe("image/png")
  })

  test("rejects a supported MIME when the filename extension disagrees", async () => {
    // Given
    const opened = await createMediaStore({ fs: createMemoryFs().fs })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    // When
    const imported = await opened.value.importFile(
      file("wall.jpg", "image/png", PNG_BYTES),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) expect(imported.error.code).toBe("unsupported_mime")
  })

  test("returns decode_failed when declared media bytes have no supported signature", async () => {
    // Given
    const opened = await createMediaStore({ fs: createMemoryFs().fs })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    // When
    const imported = await opened.value.importFile(
      file("broken.png", "image/png", new Uint8Array([1, 2, 3, 4])),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) expect(imported.error.code).toBe("decode_failed")
  })

  test("returns disk_error with close phase when durable close fails", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_disk_close",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    controls.failNextCloseWithIo = true

    // When
    const imported = await opened.value.importFile(
      file("wall.png", "image/png", PNG_BYTES),
    )

    // Then
    expect(imported.ok).toBe(false)
    if (!imported.ok) {
      expect(imported.error.code).toBe("disk_error")
      if (imported.error.code === "disk_error") {
        expect(imported.error.operation).toBe("close")
      }
    }
  })
})
