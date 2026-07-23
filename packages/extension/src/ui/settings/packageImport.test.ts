import { describe, expect, test } from "bun:test"
import { normalizeZipPaths } from "./packageImport"

describe("normalizeZipPaths", () => {
  test("strips shared top folder", () => {
    const r = normalizeZipPaths({
      "pkg/manifest.json": "{}",
      "pkg/timer.html": "<html></html>",
    })
    expect(r["manifest.json"]).toBe("{}")
    expect(r["timer.html"]).toContain("html")
  })

  test("keeps flat paths", () => {
    const r = normalizeZipPaths({ "manifest.json": "{}" })
    expect(r["manifest.json"]).toBe("{}")
  })
})
