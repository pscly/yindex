import { describe, expect, test } from "bun:test"
import { getGenerativePreset } from "./generativePresets"
import { FRAME_INTERVAL_MS, TARGET_FPS } from "./generativeRenderer"
import { mountRenderer } from "./generativeRendererTestSupport"

/**
 * Exact max frames for a synthetic duration with initial paint at t=0,
 * matching the renderer gate: timeMs - lastDrawMs >= FRAME_INTERVAL_MS - 0.5.
 * Floating floor(duration/interval)+1 is wrong (1000/(1000/30) underflows to 29.999).
 */
function maxFramesForDurationMs(durationMs: number): number {
  let frames = 1
  let last = 0
  for (let t = 1; t <= durationMs; t += 1) {
    if (t - last >= FRAME_INTERVAL_MS - 0.5) {
      frames += 1
      last = t
    }
  }
  return frames
}

describe("createGenerativeRenderer lifecycle", () => {
  test("throttles scheduled frames to TARGET_FPS ceiling over 100ms", () => {
    // Given an active animated renderer with fake 1ms ticks
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    expect(draws.length).toBe(1)
    // When 100 synthetic scheduler ticks fire 1ms apart (100ms window)
    for (let i = 1; i <= 100; i += 1) {
      clock.nowMs = i
      fake.flush(clock.nowMs)
    }
    // Then draws are exact <=30fps: 100ms permits 4 frames including initial
    const maxAllowed = maxFramesForDurationMs(100)
    expect(maxAllowed).toBe(4)
    expect(draws.length).toBeLessThanOrEqual(maxAllowed)
    expect(draws.length).toBe(4)
    expect(TARGET_FPS).toBe(30)
  })

  test("throttles scheduled frames over exact 1000ms synthetic duration", () => {
    // Given
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    // When 1000 ticks at 1ms
    for (let i = 1; i <= 1000; i += 1) {
      clock.nowMs = i
      fake.flush(clock.nowMs)
    }
    // Then <=31 including initial boundary at t=0 and t=1000
    const maxAllowed = maxFramesForDurationMs(1000)
    expect(maxAllowed).toBe(31)
    expect(draws.length).toBeLessThanOrEqual(maxAllowed)
    expect(draws.length).toBe(31)
  })

  test("inactive pages produce zero new frames after pause", () => {
    // Given a running renderer that has produced frames
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    const before = draws.length
    expect(before).toBeGreaterThan(0)
    // When page becomes inactive
    renderer.setActive(false)
    for (let i = 1; i <= 50; i += 1) {
      clock.nowMs = i * FRAME_INTERVAL_MS
      fake.flush(clock.nowMs)
    }
    // Then no additional frames are drawn and no pending schedule remains
    expect(draws.length).toBe(before)
    expect(fake.pendingCount()).toBe(0)
  })

  test("resume after inactive produces frames again", () => {
    // Given paused renderer
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    renderer.setActive(false)
    const pausedAt = draws.length
    // When resumed and ticks advance past frame interval
    renderer.setActive(true)
    clock.nowMs = FRAME_INTERVAL_MS
    fake.flush(clock.nowMs)
    clock.nowMs = FRAME_INTERVAL_MS * 2
    fake.flush(clock.nowMs)
    // Then new frames appear
    expect(draws.length).toBeGreaterThan(pausedAt)
  })

  test("reduced motion renders exactly one static frame and never loops", () => {
    // Given reduced-motion preference
    const { renderer, draws, fake, clock } = mountRenderer({
      reducedMotion: true,
    })
    // When started and many ticks arrive
    renderer.start()
    for (let i = 0; i < 40; i += 1) {
      clock.nowMs = i * 16
      fake.flush(clock.nowMs)
    }
    // Then exactly one static frame was drawn
    expect(draws.length).toBe(1)
    expect(draws[0]?.staticFrame).toBe(true)
    expect(fake.pendingCount()).toBe(0)
  })

  test("setReducedMotion mid-run collapses to one additional static path without loop", () => {
    // Given animated run
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    const animatedCount = draws.length
    // When reduced motion engages
    renderer.setReducedMotion(true)
    for (let i = 1; i <= 20; i += 1) {
      clock.nowMs = i * 16
      fake.flush(clock.nowMs)
    }
    // Then only one extra static frame and schedule cleared
    expect(draws.length).toBe(animatedCount + 1)
    expect(draws[draws.length - 1]?.staticFrame).toBe(true)
    expect(fake.pendingCount()).toBe(0)
  })

  test("repeated setReducedMotion(true) is a no-op after first transition", () => {
    // Given animated renderer
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    // When reduced motion engages once
    renderer.setReducedMotion(true)
    const afterFirst = draws.length
    expect(draws[afterFirst - 1]?.staticFrame).toBe(true)
    // When setReducedMotion(true) is repeated many times
    for (let i = 0; i < 8; i += 1) {
      clock.nowMs = 10 + i
      renderer.setReducedMotion(true)
    }
    // Then no additional static frames are painted
    expect(draws.length).toBe(afterFirst)
    expect(fake.pendingCount()).toBe(0)
  })

  test("resize updates backend dimensions and draws when active", () => {
    // Given started renderer
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    // When resized
    renderer.resize(1280, 720)
    // Then a frame observes new size (immediate redraw on resize)
    const last = draws[draws.length - 1]
    expect(last?.width).toBe(1280)
    expect(last?.height).toBe(720)
  })

  test("setPreset switches descriptor used on next draw", () => {
    // Given moment preset running
    const { renderer, draws, fake, clock } = mountRenderer({ preset: "moment" })
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    expect(draws[0]?.preset).toBe("moment")
    // When preset changes to flow
    renderer.setPreset("flow")
    clock.nowMs = FRAME_INTERVAL_MS
    fake.flush(clock.nowMs)
    // Then subsequent draw uses flow
    expect(draws[draws.length - 1]?.preset).toBe("flow")
    expect(getGenerativePreset("flow").id).toBe("flow")
  })

  test("dispose cancels schedule and disposes backend; stale ticks no-op", () => {
    // Given running renderer
    const { renderer, draws, fake, clock, disposed } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    const before = draws.length
    // When disposed
    renderer.dispose()
    expect(disposed.value).toBe(true)
    expect(fake.pendingCount()).toBe(0)
    // And stale flushes cannot grow frames
    for (let i = 1; i <= 10; i += 1) {
      clock.nowMs = i * FRAME_INTERVAL_MS
      fake.flush(clock.nowMs)
    }
    expect(draws.length).toBe(before)
  })

  test("pause and resume aliases match setActive(false/true)", () => {
    // Given running renderer
    const { renderer, draws, fake, clock } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    const afterStart = draws.length
    // When pause
    renderer.pause()
    clock.nowMs = FRAME_INTERVAL_MS
    fake.flush(clock.nowMs)
    expect(draws.length).toBe(afterStart)
    // When resume
    renderer.resume()
    clock.nowMs = FRAME_INTERVAL_MS * 2
    fake.flush(clock.nowMs)
    expect(draws.length).toBeGreaterThan(afterStart)
  })

  test("renderStaticFrame draws once without scheduling a loop", () => {
    // Given inactive non-started renderer
    const { renderer, draws, fake } = mountRenderer({ active: false })
    // When requesting a static frame
    renderer.renderStaticFrame()
    // Then one static draw and no loop
    expect(draws.length).toBe(1)
    expect(draws[0]?.staticFrame).toBe(true)
    expect(fake.pendingCount()).toBe(0)
  })

  test("repeated pause resume dispose is idempotent", () => {
    // Given started renderer
    const { renderer, disposed, fake, clock, draws } = mountRenderer({})
    renderer.start()
    clock.nowMs = 0
    fake.flush(0)
    // When pause/resume cycle thrice then dispose twice
    renderer.pause()
    renderer.resume()
    renderer.pause()
    renderer.resume()
    renderer.pause()
    renderer.resume()
    const mid = draws.length
    renderer.dispose()
    renderer.dispose()
    renderer.pause()
    renderer.resume()
    // Then backend disposed once-effectively and no further frames
    expect(disposed.value).toBe(true)
    expect(draws.length).toBe(mid)
    expect(fake.pendingCount()).toBe(0)
  })
})
