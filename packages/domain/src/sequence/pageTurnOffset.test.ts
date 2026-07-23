import { describe, expect, test } from "bun:test"

/** Mirror of host strip offset: each page is 100/n % of strip */
function pageTurnOffsetY(index: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  const v = -index * (100 / pageCount)
  return Object.is(v, -0) ? 0 : v
}

describe("pageTurnOffsetY", () => {
  test("3 pages", () => {
    expect(pageTurnOffsetY(0, 3)).toBeCloseTo(0)
    expect(pageTurnOffsetY(1, 3)).toBeCloseTo(-100 / 3)
    expect(pageTurnOffsetY(2, 3)).toBeCloseTo(-200 / 3)
  })

  test("1 page", () => {
    expect(pageTurnOffsetY(0, 1)).toBe(0)
  })
})
