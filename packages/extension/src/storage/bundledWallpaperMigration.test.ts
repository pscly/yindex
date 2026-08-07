import { describe, expect, test } from "bun:test"
import { type HomeDocument, createImageWallpaper } from "@yindex/domain"
import { createDefaultHome } from "../default/createDefaultHome"
import { applyBundledWallpaperOnce } from "./homeStorage"

function bundledImage() {
  const wallpaper = createImageWallpaper({ mediaRef: "media_bundled", dim: 0 })
  if (!wallpaper.ok) throw new Error("fixture wallpaper invalid")
  return wallpaper.value
}

function deps(overrides: {
  flag?: boolean
  seed?: () => Promise<ReturnType<typeof bundledImage> | null>
}) {
  const state = { flag: overrides.flag ?? false, saved: null as HomeDocument | null }
  return {
    state,
    readFlag: () => Promise.resolve(state.flag),
    writeFlag: () => {
      state.flag = true
      return Promise.resolve()
    },
    save: (doc: HomeDocument) => {
      state.saved = doc
      return Promise.resolve()
    },
    seed: overrides.seed ?? (() => Promise.resolve(bundledImage())),
  }
}

describe("applyBundledWallpaperOnce", () => {
  test("migrates a generative landing Page to the bundled image, once", async () => {
    // Given
    const doc = createDefaultHome()
    const d = deps({})

    // When
    const migrated = await applyBundledWallpaperOnce(doc, d)

    // Then
    const landingId = doc.sequence.pageIds[0]
    expect(landingId).toBeDefined()
    if (landingId === undefined) return
    expect(migrated.pages[landingId]?.style.wallpaper.kind).toBe("image")
    expect(d.state.flag).toBe(true)
    expect(d.state.saved).not.toBeNull()
  })

  test("never touches the Home again once the flag is set", async () => {
    // Given
    const doc = createDefaultHome()
    const d = deps({
      flag: true,
      seed: () => Promise.reject(new Error("must not seed")),
    })

    // When
    const result = await applyBundledWallpaperOnce(doc, d)

    // Then
    expect(result).toBe(doc)
    expect(d.state.saved).toBeNull()
  })

  test("respects a user-chosen media Wallpaper and only sets the flag", async () => {
    // Given — landing already on a media Wallpaper
    const base = createDefaultHome()
    const landingId = base.sequence.pageIds[0]
    if (landingId === undefined) throw new Error("landing missing")
    const landing = base.pages[landingId]
    if (!landing) throw new Error("landing missing")
    const doc: HomeDocument = {
      ...base,
      pages: {
        ...base.pages,
        [landingId]: {
          ...landing,
          style: { ...landing.style, wallpaper: bundledImage() },
        },
      },
    }
    const d = deps({
      seed: () => Promise.reject(new Error("must not seed")),
    })

    // When
    const result = await applyBundledWallpaperOnce(doc, d)

    // Then
    expect(result).toBe(doc)
    expect(d.state.flag).toBe(true)
    expect(d.state.saved).toBeNull()
  })

  test("retries next launch when seeding fails (no flag, no change)", async () => {
    // Given
    const doc = createDefaultHome()
    const d = deps({ seed: () => Promise.resolve(null) })

    // When
    const result = await applyBundledWallpaperOnce(doc, d)

    // Then
    expect(result).toBe(doc)
    expect(d.state.flag).toBe(false)
    expect(d.state.saved).toBeNull()
  })
})
