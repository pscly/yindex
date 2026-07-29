import { describe, expect, test } from "bun:test"
import { StrictMode, createElement } from "react"
import { VideoWallpaperSurface } from "./VideoWallpaperSurface"
import {
  installVideoStillTestDom,
  mountVideoSurface,
  settleReactEffects,
  videoLeaseFixture,
} from "./test/videoStillDomHarness"
import type { VideoStillUrlOwner } from "./videoWallpaperStill"
import { createVideoStillUrlOwner } from "./videoWallpaperStill"

function trackedOwnerFactory(callbacks: {
  readonly onDispose?: () => void
  readonly onReadAfterDispose?: () => void
}): () => VideoStillUrlOwner {
  return () => {
    const owner = createVideoStillUrlOwner()
    let disposed = false
    return {
      beginCapture: () => owner.beginCapture(),
      publish: (url) => owner.publish(url),
      publishIfCurrent: (generation, url) =>
        owner.publishIfCurrent(generation, url),
      clear: () => owner.clear(),
      dispose() {
        disposed = true
        callbacks.onDispose?.()
        owner.dispose()
      },
      currentUrl() {
        if (disposed) callbacks.onReadAfterDispose?.()
        return owner.currentUrl()
      },
    }
  }
}

function surfaceElement(
  input: {
    readonly leaseUrl?: string
    readonly reducedMotion?: boolean
    readonly failed?: boolean
    readonly createStillOwner?: () => VideoStillUrlOwner
  } = {},
) {
  return createElement(VideoWallpaperSurface, {
    lease: videoLeaseFixture(input.leaseUrl),
    active: true,
    reducedMotion: input.reducedMotion ?? true,
    onAnalysis: () => {},
    failed: input.failed ?? false,
    onMediaError: () => {},
    ...(input.createStillOwner === undefined
      ? {}
      : { createStillOwner: input.createStillOwner }),
  })
}

describe("mounted Video Wallpaper still lifecycle", () => {
  test("Given reduced motion and a decoded frame, When capture settles, Then pending becomes ready without playing", async () => {
    // Given
    const doc = installVideoStillTestDom()
    const mounted = mountVideoSurface(doc)

    // When
    await mounted.render(surfaceElement())

    // Then
    expect(doc.playCalls).toBe(0)
    expect(doc.pauseCalls).toBe(1)
    expect(
      mounted.host
        .querySelector("[data-video-wallpaper-still]")
        ?.getAttribute("data-video-wallpaper-still"),
    ).toBe("pending")
    expect(doc.pendingBlobs).toHaveLength(1)

    doc.settleNextCapture()
    await settleReactEffects()

    expect(
      mounted.host
        .querySelector("[data-video-wallpaper-still]")
        ?.getAttribute("data-video-wallpaper-still"),
    ).toBe("ready")
    expect(mounted.host.querySelector("video")?.getAttribute("poster")).toBe(
      "blob:still-1",
    )
    await mounted.unmount()
    expect(doc.revokedUrls).toEqual(["blob:still-1"])
  })

  test("Given published and pending stills, When media state changes, Then every URL is revoked once and stale capture cannot publish", async () => {
    // Given
    const doc = installVideoStillTestDom()
    const mounted = mountVideoSurface(doc)
    await mounted.render(surfaceElement())
    doc.settleNextCapture()
    await settleReactEffects()

    // When
    await mounted.render(surfaceElement({ leaseUrl: "blob:replacement" }))
    doc.settleNextCapture()
    await settleReactEffects()
    await mounted.render(surfaceElement({ failed: true }))
    await mounted.render(surfaceElement())
    doc.settleNextCapture(null)
    await settleReactEffects()
    expect(
      mounted.host
        .querySelector("[data-video-wallpaper-still]")
        ?.getAttribute("data-video-wallpaper-still"),
    ).toBe("pending")
    await mounted.render(surfaceElement({ reducedMotion: false }))
    await mounted.render(surfaceElement())
    await mounted.render(surfaceElement({ leaseUrl: "blob:new-video" }))
    doc.settleNextCapture()
    await settleReactEffects()

    // Then
    expect(doc.playCalls).toBe(1)
    expect(
      mounted.host
        .querySelector("[data-video-wallpaper-still]")
        ?.getAttribute("data-video-wallpaper-still"),
    ).toBe("pending")
    doc.settleNextCapture()
    await settleReactEffects()
    await mounted.unmount()
    expect(doc.createdUrls).toEqual([
      "blob:still-1",
      "blob:still-2",
      "blob:still-3",
      "blob:still-4",
    ])
    expect(doc.revokedUrls).toEqual(doc.createdUrls)
    expect(new Set(doc.revokedUrls).size).toBe(doc.revokedUrls.length)
  })

  test("Given Strict Mode and in-flight captures, When a URL and rejection settle after unmount, Then cleanup blocks rendered updates and disposed-owner reads", async () => {
    // Given
    const doc = installVideoStillTestDom()
    const mounted = mountVideoSurface(doc)
    const consoleErrors: unknown[][] = []
    const originalError = console.error
    let readsAfterDispose = 0
    console.error = (...values: unknown[]) => consoleErrors.push(values)

    // When
    try {
      await mounted.render(
        createElement(
          StrictMode,
          null,
          surfaceElement({
            createStillOwner: trackedOwnerFactory({
              onReadAfterDispose: () => {
                readsAfterDispose += 1
              },
            }),
          }),
        ),
      )
      expect(doc.playCalls).toBe(0)
      expect(doc.pendingBlobs).toHaveLength(2)
      await mounted.unmount()
      doc.settleNextCapture()
      doc.settleNextCapture(null)
      await settleReactEffects()
    } finally {
      console.error = originalError
    }

    // Then
    expect(doc.createdUrls).toEqual(["blob:still-1"])
    expect(doc.revokedUrls).toEqual(doc.createdUrls)
    expect(mounted.host.childNodes).toHaveLength(0)
    expect(readsAfterDispose).toBe(0)
    expect(consoleErrors).toEqual([])
  })

  test("Given a mounted owner, When the surface unmounts, Then owner disposal executes exactly once", async () => {
    // Given
    const doc = installVideoStillTestDom()
    const mounted = mountVideoSurface(doc)
    let disposals = 0

    // When
    await mounted.render(
      createElement(VideoWallpaperSurface, {
        lease: videoLeaseFixture(),
        active: true,
        reducedMotion: true,
        onAnalysis: () => {},
        failed: false,
        onMediaError: () => {},
        createStillOwner: trackedOwnerFactory({
          onDispose: () => {
            disposals += 1
          },
        }),
      }),
    )
    await mounted.unmount()

    // Then
    expect(disposals).toBe(1)
  })
})
