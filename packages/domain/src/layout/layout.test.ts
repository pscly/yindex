import { describe, expect, test } from "bun:test"
import { alignRects } from "./align"
import {
  buildSnapGuides,
  clampRect,
  snapRect,
  validateRect,
  withZ,
} from "./layout"
import { DEFAULT_LAYOUT_CONSTRAINTS } from "./types"

describe("Layout", () => {
  test("validate rejects out of safe bounds", () => {
    const r = validateRect({ x: 0, y: 0, w: 10, h: 10 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("out_of_bounds")
  })

  test("clampRect pulls into safe area", () => {
    const c = clampRect({ x: -10, y: 50, w: 20, h: 20 })
    expect(c.x).toBeGreaterThanOrEqual(DEFAULT_LAYOUT_CONSTRAINTS.safePct)
    expect(c.y + c.h).toBeLessThanOrEqual(
      100 - DEFAULT_LAYOUT_CONSTRAINTS.safePct,
    )
  })

  test("snap aligns to safe edge", () => {
    const guides = buildSnapGuides([])
    const result = snapRect({ x: 2.3, y: 10, w: 20, h: 20 }, guides, {
      enabled: true,
    })
    expect(result.rect.x).toBeCloseTo(DEFAULT_LAYOUT_CONSTRAINTS.safePct, 5)
    expect(result.activeGuides.length).toBeGreaterThan(0)
  })

  test("snap disabled leaves rect", () => {
    const guides = buildSnapGuides([])
    const result = snapRect({ x: 2.3, y: 10, w: 20, h: 20 }, guides, {
      enabled: false,
    })
    expect(result.rect.x).toBe(2.3)
    expect(result.activeGuides).toEqual([])
  })

  test("align left", () => {
    const rects = [
      withZ({ x: 10, y: 10, w: 10, h: 10 }, 1),
      withZ({ x: 30, y: 20, w: 10, h: 10 }, 2),
    ]
    const aligned = alignRects(rects, "left")
    expect(aligned[0]?.x).toBe(aligned[1]?.x)
  })

  test("validate accepts safe rect", () => {
    const r = validateRect({ x: 10, y: 10, w: 20, h: 20 })
    expect(r.ok).toBe(true)
  })
})
