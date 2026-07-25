import { describe, expect, test } from "bun:test"
import { err, ok } from "@yindex/domain"
import type { MediaStore } from "../wallpaper/mediaStoreTypes"
import {
  importWallpaperFile,
  wallpaperImportErrorMessage,
} from "./editWallpaper"

function rejectingStore(): MediaStore {
  return {
    importFile: async () =>
      err({
        code: "video_too_large",
        byteLength: 101 * 1024 * 1024,
        maxBytes: 100 * 1024 * 1024,
        message: "video exceeds the 100 MiB limit",
      }),
    list: async () => ok([]),
    read: async () =>
      err({
        code: "corrupt_asset",
        message: "not used by this test",
      }),
    delete: async () => ok(undefined),
    capacity: async () =>
      ok({ usedBytes: 0, quotaBytes: null, assetCount: 0, assetBytes: 0 }),
  }
}

describe("Edit Wallpaper upload", () => {
  test("reports the video size limit when the MediaStore rejects an upload", async () => {
    // Given
    const file = new File([new Uint8Array([0])], "too-large.mp4", {
      type: "video/mp4",
    })

    // When
    const result = await importWallpaperFile(rejectingStore(), file, 0.2)

    // Then
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("rejected upload must return an error")
    expect(result.error.code).toBe("video_too_large")
    expect(wallpaperImportErrorMessage(result.error)).toContain("100 MiB")
  })
})
