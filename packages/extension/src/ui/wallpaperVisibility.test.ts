import { describe, expect, test } from "bun:test"
import { isWallpaperActive } from "./wallpaperVisibility"

describe("Wallpaper document visibility", () => {
  test("Given an active Page in a hidden document, When activity resolves, Then its Wallpaper pauses", () => {
    // Given / When
    const active = isWallpaperActive(true, "hidden")

    // Then
    expect(active).toBe(false)
  })

  test("Given an active Page in a visible document, When activity resolves, Then its Wallpaper runs", () => {
    // Given / When
    const active = isWallpaperActive(true, "visible")

    // Then
    expect(active).toBe(true)
  })

  test("Given an inactive Page in a visible document, When activity resolves, Then its Wallpaper stays paused", () => {
    // Given / When
    const active = isWallpaperActive(false, "visible")

    // Then
    expect(active).toBe(false)
  })
})
