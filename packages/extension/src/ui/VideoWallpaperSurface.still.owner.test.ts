import { describe, expect, test } from "bun:test"
import { createVideoStillUrlOwner } from "./videoWallpaperStill"

describe("Video Wallpaper still URL owner", () => {
  test("Given sequential stills, When replaced, cleared, and disposed, Then each URL is revoked once", () => {
    // Given
    const revoked: string[] = []
    const owner = createVideoStillUrlOwner({
      revokeObjectUrl: (url) => revoked.push(url),
    })

    // When
    owner.publish("blob:a")
    owner.publish("blob:b")
    owner.clear()
    owner.dispose()
    owner.dispose()

    // Then
    expect(revoked).toEqual(["blob:a", "blob:b"])
  })

  test("Given a capture that settles after dispose, When it publishes, Then its URL is revoked and never current", () => {
    // Given
    const revoked: string[] = []
    const owner = createVideoStillUrlOwner({
      revokeObjectUrl: (url) => revoked.push(url),
    })
    const generation = owner.beginCapture()

    // When
    owner.dispose()
    const accepted = owner.publishIfCurrent(generation, "blob:late")

    // Then
    expect(accepted).toBe(false)
    expect(owner.currentUrl()).toBeNull()
    expect(revoked).toEqual(["blob:late"])
  })

  test("Given replacement while a capture is in flight, When stale capture settles, Then only stale URL is revoked", () => {
    // Given
    const revoked: string[] = []
    const owner = createVideoStillUrlOwner({
      revokeObjectUrl: (url) => revoked.push(url),
    })
    const first = owner.beginCapture()
    const second = owner.beginCapture()

    // When
    expect(owner.publishIfCurrent(second, "blob:second")).toBe(true)
    expect(owner.publishIfCurrent(first, "blob:first-late")).toBe(false)

    // Then
    expect(owner.currentUrl()).toBe("blob:second")
    expect(revoked).toEqual(["blob:first-late"])
    owner.dispose()
    expect(revoked).toEqual(["blob:first-late", "blob:second"])
  })
})
