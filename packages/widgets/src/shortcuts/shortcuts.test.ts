import { describe, expect, test } from "bun:test"
import { faviconForUrl } from "./ShortcutsWidget"

describe("faviconForUrl", () => {
  test("parses host", () => {
    expect(faviconForUrl("https://github.com/foo")).toContain("github.com")
  })
  test("invalid", () => {
    expect(faviconForUrl("not a url")).toBeUndefined()
  })
})
