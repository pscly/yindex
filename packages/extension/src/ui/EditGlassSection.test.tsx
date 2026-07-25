import { describe, expect, test } from "bun:test"
import type { HomeDocument } from "@yindex/domain"
import { createDefaultHome } from "../default/createDefaultHome"
import { selectGlassProfile } from "./EditGlassSection"

describe("Edit Glass Profile", () => {
  test("publishes the selected Profile as a live Page document", () => {
    // Given
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    if (pageId === undefined)
      throw new Error("default Home must contain a Page")
    const page = doc.pages[pageId]
    if (page === undefined) throw new Error("default Home Page must exist")
    let published: HomeDocument | null = doc

    // When
    selectGlassProfile(
      {
        doc,
        page,
        pageId,
        onDoc: (next) => {
          published = next
        },
      },
      "deep",
    )

    // Then
    expect(published.pages[pageId]?.style.glassProfile).toBe("deep")
  })
})
