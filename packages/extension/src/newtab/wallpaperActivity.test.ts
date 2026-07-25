import { describe, expect, test } from "bun:test"
import { activeWallpaperSlots } from "./wallpaperActivity"

describe("Wallpaper activity across the Page Turn strip", () => {
  test("Given an idle strip, When activity resolves, Then only the current real Page is active", () => {
    // Given / When
    const slots = activeWallpaperSlots({
      fadeLayers: null,
      offsetY: -20,
      stripSlots: 5,
    })

    // Then
    expect([...slots]).toEqual([1])
  })

  test("Given a Page Turn between Pages, When activity resolves, Then only current and incoming slots are active", () => {
    // Given / When
    const slots = activeWallpaperSlots({
      fadeLayers: null,
      offsetY: -28,
      stripSlots: 5,
    })

    // Then
    expect([...slots]).toEqual([1, 2])
  })

  test("Given a reduced-motion crossfade, When activity resolves, Then its outgoing and incoming real Pages are active", () => {
    // Given / When
    const slots = activeWallpaperSlots({
      fadeLayers: {
        outgoing: { index: 2, opacity: 0.5 },
        incoming: { index: 0, opacity: 0.5 },
      },
      offsetY: -60,
      stripSlots: 5,
    })

    // Then
    expect([...slots]).toEqual([1, 3])
  })
})
