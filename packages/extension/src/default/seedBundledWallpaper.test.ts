import { describe, expect, test } from "bun:test"
import { createMediaStore, createMemoryFs } from "../wallpaper/mediaStore"
import { seedBundledWallpaper } from "./seedBundledWallpaper"

const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0xff, 0xd9])

function fakeFile(): Promise<File> {
  return Promise.resolve(
    new File([FAKE_JPEG], "yindex-bundled-blue-skies.jpg", {
      type: "image/jpeg",
    }),
  )
}

async function memoryStore() {
  const created = await createMediaStore({ fs: createMemoryFs().fs })
  if (!created.ok) throw new Error("memory store unavailable")
  return created.value
}

describe("seedBundledWallpaper", () => {
  test("imports the bundled image once and returns an image Wallpaper", async () => {
    // Given
    const store = await memoryStore()

    // When
    const wallpaper = await seedBundledWallpaper({ store, fetchFile: fakeFile })

    // Then
    expect(wallpaper?.kind).toBe("image")
    const listed = await store.list()
    expect(listed.ok && listed.value.length).toBe(1)
  })

  test("reuses the already-imported asset instead of importing twice", async () => {
    // Given
    const store = await memoryStore()
    const first = await seedBundledWallpaper({ store, fetchFile: fakeFile })

    // When — a failing fetch proves no re-import happens
    const second = await seedBundledWallpaper({
      store,
      fetchFile: () => Promise.reject(new Error("must not fetch")),
    })

    // Then
    expect(second?.kind).toBe("image")
    if (second?.kind !== "image" || first?.kind !== "image") {
      throw new Error("expected image wallpapers")
    }
    expect(String(second.mediaRef)).toBe(String(first.mediaRef))
    const listed = await store.list()
    expect(listed.ok && listed.value.length).toBe(1)
  })

  test("yields null when the fetch fails, so callers keep the generative default", async () => {
    // Given
    const store = await memoryStore()

    // When
    const wallpaper = await seedBundledWallpaper({
      store,
      fetchFile: () => Promise.reject(new Error("offline")),
    })

    // Then
    expect(wallpaper).toBeNull()
  })
})
