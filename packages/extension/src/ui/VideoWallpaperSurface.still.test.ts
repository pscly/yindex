import { describe, expect, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { WallpaperMediaUrlLease } from "../wallpaper/wallpaperMediaUrl"
import {
  VideoWallpaperSurface,
  shouldPlayVideoWallpaper,
  videoWallpaperPresentation,
} from "./VideoWallpaperSurface"

function leaseFixture(): WallpaperMediaUrlLease {
  return {
    blob: new Blob([new Uint8Array([0, 0, 0, 1])], { type: "video/webm" }),
    contentHash: "fixture-video-hash",
    url: "blob:video-fixture",
    release() {},
  }
}

function renderSurface(input: {
  readonly lease: WallpaperMediaUrlLease | null
  readonly reducedMotion: boolean
  readonly failed: boolean
}): string {
  return renderToStaticMarkup(
    createElement(VideoWallpaperSurface, {
      ...input,
      active: true,
      onAnalysis: () => {},
      onMediaError: () => {},
    }),
  )
}

describe("Video Wallpaper still presentation", () => {
  test("Given an active Page with reduced motion, When presentation resolves, Then it is static and never plays", () => {
    // Given / When
    const presentation = videoWallpaperPresentation(true, true)

    // Then
    expect(presentation).toBe("static-still")
    expect(shouldPlayVideoWallpaper(presentation)).toBe(false)
  })

  test("Given normal motion, When presentation resolves, Then muted loop playback is allowed", () => {
    // Given / When
    const presentation = videoWallpaperPresentation(true, false)

    // Then
    expect(presentation).toBe("playback")
    expect(shouldPlayVideoWallpaper(presentation)).toBe(true)
  })

  test("Given an inactive Page, When presentation resolves, Then it never plays", () => {
    // Given / When / Then
    expect(videoWallpaperPresentation(false, false)).toBe("inactive")
    expect(videoWallpaperPresentation(false, true)).toBe("inactive")
    expect(shouldPlayVideoWallpaper("inactive")).toBe(false)
  })

  test("Given reduced motion before capture, When server markup renders, Then the static poster layer starts pending", () => {
    // Given / When
    const markup = renderSurface({
      lease: leaseFixture(),
      reducedMotion: true,
      failed: false,
    })

    // Then
    expect(markup).toContain('data-video-presentation="static-still"')
    expect(markup).toContain('data-video-wallpaper-still="pending"')
    expect(markup).toContain("muted")
    expect(markup).toContain("loop")
    expect(markup).toContain("playsInline")
  })

  test("Given normal motion, When server markup renders, Then no static layer is mounted", () => {
    // Given / When
    const markup = renderSurface({
      lease: leaseFixture(),
      reducedMotion: false,
      failed: false,
    })

    // Then
    expect(markup).toContain('data-video-presentation="playback"')
    expect(markup).not.toContain("data-video-wallpaper-still=")
  })

  test("Given missing or failed media, When reduced motion renders, Then no ready still is exposed", () => {
    // Given / When
    const missing = renderSurface({
      lease: null,
      reducedMotion: true,
      failed: false,
    })
    const failed = renderSurface({
      lease: leaseFixture(),
      reducedMotion: true,
      failed: true,
    })

    // Then
    expect(missing).toContain('data-video-wallpaper-still="pending"')
    expect(failed).toContain('data-video-wallpaper-still="pending"')
    expect(missing).not.toContain('data-video-wallpaper-still="ready"')
    expect(failed).not.toContain('data-video-wallpaper-still="ready"')
  })
})
