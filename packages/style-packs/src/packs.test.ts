import { describe, expect, test } from "bun:test"
import { FLOW, MOMENT, MUSE, STYLE_PACKS, getStylePack } from "./packs"

describe("style packs (scene presets)", () => {
  test("three scene packs with generative presets", () => {
    // Given / When / Then
    expect(STYLE_PACKS).toHaveLength(3)
    expect(getStylePack("moment")?.name).toBe("此刻")
    expect(MOMENT.generativePreset).toBe("moment")
    expect(MUSE.generativePreset).toBe("muse")
    expect(FLOW.generativePreset).toBe("flow")
    expect(MOMENT.pageStyle.glassProfile).toBe("balanced")
    expect(MOMENT.tokens.glass.enabled).toBe(true)
    expect(MUSE.tokens.color.accent).toContain("oklch")
  })

  test("legacy ids still resolve", () => {
    // Given / When / Then
    expect(getStylePack("caliper")?.generativePreset).toBe("moment")
    expect(getStylePack("inkstone")?.generativePreset).toBe("muse")
    expect(getStylePack("dew-glass")?.generativePreset).toBe("flow")
  })
})
