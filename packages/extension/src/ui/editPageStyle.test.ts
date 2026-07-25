import { describe, expect, test } from "bun:test"
import { createGenerativeWallpaper, withWallpaper } from "@yindex/domain"
import { MUSE } from "@yindex/style-packs"
import { createDefaultHome } from "../default/createDefaultHome"
import { applyGlassProfile, applyPageStyle } from "./editPageStyle"

function firstPage() {
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  if (pageId === undefined) throw new Error("default Home must contain a Page")
  const page = doc.pages[pageId]
  if (page === undefined) throw new Error("default Home Page must exist")
  return { doc, page, pageId }
}

describe("Edit Page Style mutations", () => {
  test("applies the deep Glass Profile to the selected Page", () => {
    // Given
    const { doc, page, pageId } = firstPage()

    // When
    const updated = applyGlassProfile(doc, pageId, page.style, "deep")

    // Then
    expect(updated?.pages[pageId]?.style.glassProfile).toBe("deep")
  })

  test("applies a new dim while preserving a generative Wallpaper", () => {
    // Given
    const { doc, page, pageId } = firstPage()
    const wallpaper = createGenerativeWallpaper({
      generativePreset: "moment",
      dim: 0.48,
    })
    if (!wallpaper.ok) throw new Error(wallpaper.error.message)

    // When
    const updated = applyPageStyle(
      doc,
      pageId,
      withWallpaper(page.style, wallpaper.value),
    )

    // Then
    expect(Number(updated?.pages[pageId]?.style.wallpaper.dim)).toBe(0.48)
    expect(updated?.pages[pageId]?.style.wallpaper.kind).toBe("generative")
  })

  test("applies a Style Pack Page Style to the selected Page", () => {
    // Given
    const { doc, pageId } = firstPage()

    // When
    const updated = applyPageStyle(doc, pageId, MUSE.pageStyle)

    // Then
    expect(updated?.pages[pageId]?.style).toEqual(MUSE.pageStyle)
  })
})
