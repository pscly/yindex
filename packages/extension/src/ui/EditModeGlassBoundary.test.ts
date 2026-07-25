import { describe, expect, test } from "bun:test"

const EDIT_MODULES = [
  "EditChrome.tsx",
  "EditGlassSection.tsx",
  "EditPageSequence.tsx",
  "EditStylePackSection.tsx",
  "EditWallpaperSection.tsx",
] as const

const ADVANCED_GLASS_CONTROLS = [
  "transmission",
  "blur",
  "saturation",
  "highlight",
] as const

describe("Edit Mode Glass boundary", () => {
  test("keeps advanced Glass tuning controls out of Edit modules", async () => {
    // Given
    const sources = await Promise.all(
      EDIT_MODULES.map((fileName) =>
        Bun.file(`${import.meta.dir}/${fileName}`).text(),
      ),
    )

    // When / Then
    for (const source of sources) {
      for (const control of ADVANCED_GLASS_CONTROLS) {
        expect(source.toLowerCase()).not.toContain(control)
      }
    }
  })
})
