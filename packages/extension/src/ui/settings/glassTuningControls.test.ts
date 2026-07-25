import { describe, expect, test } from "bun:test"
import { createDefaultHome } from "../../default/createDefaultHome"
import {
  applyGlassTuningToPage,
  clampGlassTuningInput,
} from "./glassTuningControls"

describe("Settings glass tuning controls", () => {
  test("Given extreme blur, When tuning input is clamped, Then blur stops at 12", () => {
    // Given
    const input = { blur: 99 }

    // When
    const tuning = clampGlassTuningInput(input)

    // Then
    expect(tuning.blur).toBe(12)
  })

  test("Given extreme transmission, When tuning input is clamped, Then transmission stops at -0.2", () => {
    // Given
    const input = { transmission: -9 }

    // When
    const tuning = clampGlassTuningInput(input)

    // Then
    expect(tuning.transmission).toBe(-0.2)
  })

  test("Given a Page, When valid tuning is applied, Then the updated Home publishes that tuning", () => {
    // Given
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    if (pageId === undefined) {
      throw new Error("default Home must contain a Page")
    }

    // When
    const updated = applyGlassTuningToPage(doc, pageId, {
      blur: 6,
      highlight: 0.1,
    })

    // Then
    if (updated === null) throw new Error("expected tuning update to succeed")
    expect(updated.pages[pageId]?.style.glassTuning.blur).toBe(6)
    expect(updated.pages[pageId]?.style.glassTuning.highlight).toBe(0.1)
    expect(doc.pages[pageId]?.style.glassTuning.blur).toBe(0)
  })
})
