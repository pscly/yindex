import { describe, expect, test } from "bun:test"
import { CALIPER, DEW_GLASS, INKSTONE, getStylePack, STYLE_PACKS } from "./packs"

describe("style packs", () => {
  test("three launch packs", () => {
    expect(STYLE_PACKS).toHaveLength(3)
    expect(getStylePack("inkstone")?.name).toBe("知识·典籍")
    expect(CALIPER.tokens.elevation.mode).toBe("flat")
    expect(DEW_GLASS.tokens.glass.enabled).toBe(true)
    expect(INKSTONE.tokens.color.accent).toContain("oklch")
  })
})
