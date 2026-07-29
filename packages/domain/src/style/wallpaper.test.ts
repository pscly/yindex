import { describe, expect, test } from "bun:test"
import {
  createGenerativeWallpaper,
  createImageWallpaper,
  createVideoWallpaper,
  wallpaperDim,
} from "./wallpaper"

describe("Wallpaper constructors", () => {
  test("generative carries typed preset and bounded dim", () => {
    // Given / When
    const r = createGenerativeWallpaper({ generativePreset: "muse", dim: 0.25 })
    // Then
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.kind).toBe("generative")
      if (r.value.kind === "generative") {
        expect(r.value.generativePreset).toBe("muse")
      }
      expect(Number(r.value.dim)).toBe(0.25)
    }
  })

  test("image and video require non-empty mediaRef", () => {
    // Given / When
    const empty = createImageWallpaper({ mediaRef: "", dim: 0.1 })
    const okImg = createImageWallpaper({ mediaRef: "opfs:abc", dim: 0.1 })
    const okVid = createVideoWallpaper({ mediaRef: "opfs:vid", dim: 0.5 })
    // Then
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.error.code).toBe("invalid_media_ref")
    expect(okImg.ok).toBe(true)
    expect(okVid.ok).toBe(true)
    if (okImg.ok && okImg.value.kind === "image") {
      expect(String(okImg.value.mediaRef)).toBe("opfs:abc")
    }
  })

  test("dim outside [0,1] is rejected", () => {
    // Given / When
    const low = wallpaperDim(-0.01)
    const high = wallpaperDim(1.01)
    const edge = wallpaperDim(1)
    // Then
    expect(low.ok).toBe(false)
    expect(high.ok).toBe(false)
    expect(edge.ok).toBe(true)
  })
})
