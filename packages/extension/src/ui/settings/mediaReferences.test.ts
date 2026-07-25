import { describe, expect, test } from "bun:test"
import {
  createImageWallpaper,
  createVideoWallpaper,
  updatePage,
} from "@yindex/domain"
import { createDefaultHome } from "../../default/createDefaultHome"
import { makeFile, openStore } from "../../wallpaper/mediaStoreTestUtils.test"
import {
  capacityLabel,
  deleteMediaIfUnused,
  formatMediaBytes,
  isMediaRefInUse,
  pagesUsingMediaRef,
} from "./mediaReferences"

describe("Wallpaper media references", () => {
  test("Given two Pages share one asset, When references are inspected, Then both Pages are reported and the generative Page is ignored", async () => {
    // Given
    const { store } = await openStore({ createId: () => "media_shared" })
    const imported = await store.importFile(
      makeFile({
        name: "shared.png",
        type: "image/png",
        bytes: new Uint8Array([1, 2, 3, 4]),
      }),
    )
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    const [firstId, secondId, generativeId] =
      createDefaultHome().sequence.pageIds
    if (!firstId || !secondId || !generativeId) {
      throw new Error("default Home must contain three Pages")
    }
    const image = createImageWallpaper({
      mediaRef: String(imported.value.ref),
      dim: 0.1,
    })
    const video = createVideoWallpaper({
      mediaRef: String(imported.value.ref),
      dim: 0.2,
    })
    expect(image.ok && video.ok).toBe(true)
    if (!image.ok || !video.ok) return
    const firstUpdate = updatePage(createDefaultHome(), firstId, (page) => ({
      ...page,
      style: { ...page.style, wallpaper: image.value },
    }))
    expect(firstUpdate.ok).toBe(true)
    if (!firstUpdate.ok) return
    const secondUpdate = updatePage(firstUpdate.value, secondId, (page) => ({
      ...page,
      style: { ...page.style, wallpaper: video.value },
    }))
    expect(secondUpdate.ok).toBe(true)
    if (!secondUpdate.ok) return

    // When
    const usages = pagesUsingMediaRef(secondUpdate.value, imported.value.ref)

    // Then
    expect(usages).toEqual([
      { pageId: firstId, pageName: "此刻" },
      { pageId: secondId, pageName: "灵感" },
    ])
    expect(usages.some(({ pageId }) => pageId === generativeId)).toBe(false)
    expect(isMediaRefInUse(secondUpdate.value, imported.value.ref)).toBe(true)
  })

  test("Given an asset is referenced, When deletion is requested, Then deletion is blocked with structured Page details", async () => {
    // Given
    const { store } = await openStore({ createId: () => "media_guarded" })
    const imported = await store.importFile(
      makeFile({
        name: "guarded.jpg",
        type: "image/jpeg",
        bytes: new Uint8Array([5, 6, 7]),
      }),
    )
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    if (!pageId) throw new Error("default Home must contain a Page")
    const wallpaper = createImageWallpaper({
      mediaRef: String(imported.value.ref),
      dim: 0.15,
    })
    expect(wallpaper.ok).toBe(true)
    if (!wallpaper.ok) return
    const referenced = updatePage(doc, pageId, (page) => ({
      ...page,
      style: { ...page.style, wallpaper: wallpaper.value },
    }))
    expect(referenced.ok).toBe(true)
    if (!referenced.ok) return

    // When
    const result = await deleteMediaIfUnused(
      referenced.value,
      store,
      imported.value.ref,
    )

    // Then
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toEqual({
        code: "in_use",
        pageIds: [pageId],
        pageNames: ["此刻"],
        message: "壁纸正被「此刻」使用，请先为这些页更换壁纸。",
      })
    }
    const assets = await store.list()
    expect(assets.ok).toBe(true)
    if (assets.ok) expect(assets.value).toHaveLength(1)
  })

  test("Given all Pages are reassigned, When deletion is requested, Then the asset is deleted", async () => {
    // Given
    const { store } = await openStore({ createId: () => "media_free" })
    const imported = await store.importFile(
      makeFile({
        name: "free.png",
        type: "image/png",
        bytes: new Uint8Array([8, 9, 10, 11]),
      }),
    )
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    if (!pageId) throw new Error("default Home must contain a Page")
    const originalWallpaper = doc.pages[pageId]?.style.wallpaper
    if (!originalWallpaper)
      throw new Error("default Page must have a wallpaper")
    const mediaWallpaper = createImageWallpaper({
      mediaRef: String(imported.value.ref),
      dim: 0.1,
    })
    expect(mediaWallpaper.ok).toBe(true)
    if (!mediaWallpaper.ok) return
    const referenced = updatePage(doc, pageId, (page) => ({
      ...page,
      style: { ...page.style, wallpaper: mediaWallpaper.value },
    }))
    expect(referenced.ok).toBe(true)
    if (!referenced.ok) return
    const reassigned = updatePage(referenced.value, pageId, (page) => ({
      ...page,
      style: { ...page.style, wallpaper: originalWallpaper },
    }))
    expect(reassigned.ok).toBe(true)
    if (!reassigned.ok) return

    // When
    const result = await deleteMediaIfUnused(
      reassigned.value,
      store,
      imported.value.ref,
    )

    // Then
    expect(result).toEqual({ ok: true, value: undefined })
    expect(isMediaRefInUse(reassigned.value, imported.value.ref)).toBe(false)
    const assets = await store.list()
    expect(assets.ok).toBe(true)
    if (assets.ok) expect(assets.value).toHaveLength(0)
  })
})

describe("Wallpaper media capacity labels", () => {
  test("Given byte counts, When formatted, Then binary units stay compact and readable", () => {
    expect(formatMediaBytes(0)).toBe("0 B")
    expect(formatMediaBytes(1536)).toBe("1.5 KB")
    expect(formatMediaBytes(5 * 1024 * 1024)).toBe("5 MB")
  })

  test("Given browser quota is available, When capacity is labelled, Then asset and origin usage are both disclosed", () => {
    expect(
      capacityLabel({
        assetCount: 2,
        assetBytes: 1536,
        usedBytes: 5 * 1024 * 1024,
        quotaBytes: 20 * 1024 * 1024,
      }),
    ).toBe("壁纸 2 个 · 1.5 KB · 浏览器 5 MB / 20 MB")
  })
})
