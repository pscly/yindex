import { describe, expect, test } from "bun:test"
import { localFontFamily } from "./localFontFamilies"

describe("localFontFamily", () => {
  test("maps Noto SC token names to packaged Fontsource variable families", () => {
    // Given: a Domain typography stack using the product-level family names
    const family = '"Noto Serif SC", "Noto Sans SC", system-ui, sans-serif'

    // When: the Extension prepares the stack for rendering
    const localized = localFontFamily(family)

    // Then: both Noto names resolve to the locally registered variable families
    expect(localized).toBe(
      '"Noto Serif SC Variable", "Noto Sans SC Variable", system-ui, sans-serif',
    )
  })
})
