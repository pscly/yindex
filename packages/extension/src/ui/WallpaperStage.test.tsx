import { describe, expect, test } from "bun:test"
import {
  createImageWallpaper,
  createVideoWallpaper,
  err,
  mediaRef,
  ok,
} from "@yindex/domain"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { createWallpaperMediaUrlPool } from "../wallpaper/wallpaperMediaUrl"
import { PageCanvas } from "./PageCanvas"
import { WallpaperRecoveryAction } from "./WallpaperStage"

const noWidget = (): void => {}

function renderFirstPage(wallpaperKind: "generative" | "image" | "video") {
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  const page = pageId === undefined ? undefined : doc.pages[pageId]
  if (page === undefined)
    throw new Error("default Home must contain its first Page")

  const wallpaper =
    wallpaperKind === "generative"
      ? page.style.wallpaper
      : wallpaperKind === "image"
        ? createImageWallpaper({ mediaRef: "fixture-image", dim: 0.2 })
        : createVideoWallpaper({ mediaRef: "fixture-video", dim: 0.3 })
  if ("ok" in wallpaper && !wallpaper.ok) {
    throw new Error(wallpaper.error.message)
  }
  const source = "ok" in wallpaper ? wallpaper.value : wallpaper

  return renderToStaticMarkup(
    createElement(PageCanvas, {
      doc,
      page: { ...page, style: { ...page.style, wallpaper: source } },
      editMode: false,
      selectedWidgetId: null,
      onSelectWidget: noWidget,
      onWidgetConfig: noWidget,
    }),
  )
}

describe("WallpaperStage PageCanvas mount", () => {
  test("Given missing Wallpaper media, When recovery renders, Then it exposes a keyboard-native Settings action without motion", () => {
    // Given / When
    const markup = renderToStaticMarkup(
      createElement(WallpaperRecoveryAction, { onOpenSettings: noWidget }),
    )

    // Then
    expect(markup).toContain('<button type="button"')
    expect(markup).toContain('data-wallpaper-recovery="true"')
    expect(markup).toContain("壁纸缺失 · 打开设置重新选择")
    expect(markup).toContain("animation:none;transition:none")
  })

  test("Given the default Home, When its first Page renders, Then a real generative canvas sits beneath Widgets", () => {
    // Given / When
    const markup = renderFirstPage("generative")

    // Then
    expect(markup).toContain('data-wallpaper-kind="generative"')
    expect(markup).toContain("<canvas")
    expect(markup).toContain('data-wallpaper-dim="true"')
  })

  test("Given an image Wallpaper, When its Page renders before media is ready, Then it never paints the MediaRef as CSS", () => {
    // Given / When
    const markup = renderFirstPage("image")

    // Then
    expect(markup).toContain('data-wallpaper-kind="image"')
    expect(markup).not.toContain("fixture-image")
    expect(markup).toContain('data-wallpaper-fallback="true"')
    expect(markup).not.toContain("data-wallpaper-recovery=")
  })

  test("Given a video Wallpaper, When its Page renders, Then the media element has ambient playback attributes", () => {
    // Given / When
    const markup = renderFirstPage("video")

    // Then
    expect(markup).toContain('data-wallpaper-kind="video"')
    expect(markup).toContain("muted")
    expect(markup).toContain("loop")
    expect(markup).toContain("playsInline")
    expect(markup).not.toContain("fixture-video")
    expect(markup).not.toContain("data-wallpaper-recovery=")
  })
})

describe("Wallpaper media object URL ownership", () => {
  test("Given two Loop slots using one immutable blob, When both release it, Then one object URL is created and revoked once", async () => {
    // Given
    const parsedRef = mediaRef("shared-image")
    if (!parsedRef.ok) throw new Error(parsedRef.error.message)
    const created: Blob[] = []
    const revoked: string[] = []
    const pool = createWallpaperMediaUrlPool({
      read: async () =>
        ok({
          ref: parsedRef.value,
          kind: "image",
          mimeType: "image/png",
          bytes: new Uint8Array([1, 2, 3]),
          byteLength: 3,
          contentHash: "fixture-sha256",
        }),
      createObjectUrl: (blob) => {
        created.push(blob)
        return "blob:shared"
      },
      revokeObjectUrl: (url) => revoked.push(url),
    })

    // When
    const first = await pool.acquire(parsedRef.value, "image")
    const clone = await pool.acquire(parsedRef.value, "image")
    first?.release()
    clone?.release()

    // Then
    expect(first?.url).toBe("blob:shared")
    expect(clone?.url).toBe("blob:shared")
    expect(created).toHaveLength(1)
    expect(revoked).toEqual(["blob:shared"])
  })

  test("Given missing media, When a lease is requested, Then no object URL is created", async () => {
    // Given
    const parsedRef = mediaRef("deleted-image")
    if (!parsedRef.ok) throw new Error(parsedRef.error.message)
    let creates = 0
    const pool = createWallpaperMediaUrlPool({
      read: async () =>
        err({
          code: "not_found",
          ref: parsedRef.value,
          message: "deleted",
        }),
      createObjectUrl: () => {
        creates += 1
        return "blob:unexpected"
      },
      revokeObjectUrl: () => {},
    })

    // When
    const lease = await pool.acquire(parsedRef.value, "image")

    // Then
    expect(lease).toBeNull()
    expect(creates).toBe(0)
  })
})
