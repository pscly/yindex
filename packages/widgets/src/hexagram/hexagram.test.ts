import { describe, expect, test } from "bun:test"
import { findByIndex, findByTrigrams, HEXAGRAMS, localDateKey, randomHexagram } from "./data"

describe("hexagram data", () => {
  test("has 64 hexagrams", () => {
    expect(HEXAGRAMS).toHaveLength(64)
    expect(findByIndex(1)?.name).toBe("乾")
    expect(findByIndex(64)?.name).toBe("未济")
  })

  test("matrix lookup", () => {
    const qian = findByTrigrams(0, 0)
    expect(qian?.name).toBe("乾")
    const kun = findByTrigrams(7, 7)
    expect(kun?.name).toBe("坤")
  })

  test("random returns valid", () => {
    const h = randomHexagram(() => 0)
    expect(h.index).toBe(1)
  })

  test("localDateKey format", () => {
    expect(localDateKey(new Date("2026-07-23T12:00:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
