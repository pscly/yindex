import { describe, expect, test } from "bun:test"
import { applyLayoutDraft } from "./editLayout"
import { withZ } from "./layout"
import { DEFAULT_LAYOUT_CONSTRAINTS } from "./types"

describe("applyLayoutDraft", () => {
  test("clamps out of bounds without snap", () => {
    const r = applyLayoutDraft({
      draft: { x: -5, y: 10, w: 20, h: 20 },
      z: 1,
      others: [],
      snapEnabled: false,
      altKeyDisablesSnap: false,
    })
    expect(r.layout.x).toBeGreaterThanOrEqual(
      DEFAULT_LAYOUT_CONSTRAINTS.safePct,
    )
    expect(r.snapped).toBe(false)
  })

  test("snaps near safe edge when enabled", () => {
    const r = applyLayoutDraft({
      draft: { x: 2.2, y: 10, w: 20, h: 20 },
      z: 1,
      others: [],
      snapEnabled: true,
      altKeyDisablesSnap: false,
    })
    expect(r.layout.x).toBeCloseTo(DEFAULT_LAYOUT_CONSTRAINTS.safePct, 5)
    expect(r.snapped).toBe(true)
  })

  test("alt disables snap", () => {
    const r = applyLayoutDraft({
      draft: { x: 2.2, y: 10, w: 20, h: 20 },
      z: 1,
      others: [withZ({ x: 40, y: 40, w: 10, h: 10 }, 0)],
      snapEnabled: true,
      altKeyDisablesSnap: true,
    })
    expect(r.layout.x).toBeCloseTo(2.2, 1)
    expect(r.snapped).toBe(false)
  })
})
