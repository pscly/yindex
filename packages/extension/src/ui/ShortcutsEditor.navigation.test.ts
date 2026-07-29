import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { tryAddShortcutItem } from "./ShortcutsEditor"

describe("ShortcutsEditor mounted add sink", () => {
  test("add path rejects javascript URLs and never emits them", () => {
    // Given / When
    const result = tryAddShortcutItem({
      title: "Evil",
      url: "javascript:alert(1)",
      existing: [],
      now: 1,
    })

    // Then
    expect(result).toBeNull()
  })

  test("add path accepts https and prefixes bare hosts through the safe boundary", () => {
    // Given / When
    const httpsItems = tryAddShortcutItem({
      title: "GitHub",
      url: "https://github.com",
      existing: [],
      now: 2,
    })
    const bare = tryAddShortcutItem({
      title: "Example",
      url: "example.com/path",
      existing: [],
      now: 3,
    })

    // Then
    expect(httpsItems).not.toBeNull()
    expect(httpsItems?.[0]?.url).toBe("https://github.com/")
    expect(httpsItems?.[0]?.title).toBe("GitHub")
    expect(bare?.[0]?.url).toBe("https://example.com/path")
  })

  test("add path rejects data, file, and blob schemes", () => {
    expect(
      tryAddShortcutItem({
        title: "Data",
        url: "data:text/html,<h1>x",
        existing: [],
        now: 4,
      }),
    ).toBeNull()
    expect(
      tryAddShortcutItem({
        title: "File",
        url: "file:///etc/passwd",
        existing: [],
        now: 5,
      }),
    ).toBeNull()
    expect(
      tryAddShortcutItem({
        title: "Blob",
        url: "blob:https://example.com/uuid",
        existing: [],
        now: 6,
      }),
    ).toBeNull()
  })

  test("ShortcutsEditor source routes add through tryAddShortcutItem and parseSafeNavigationUrl", () => {
    // Given / When
    const source = readFileSync(
      join(import.meta.dir, "ShortcutsEditor.tsx"),
      "utf8",
    )

    // Then
    expect(source).toContain("tryAddShortcutItem")
    expect(source).toContain("parseSafeNavigationUrl")
    expect(source).toMatch(/onChange\(\s*next\s*\)/)
  })
})
