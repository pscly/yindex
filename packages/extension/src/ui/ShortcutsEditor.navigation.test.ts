import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { tryAddShortcutFolder, tryAddShortcutItem } from "./ShortcutsEditor"

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
    expect(httpsItems?.[0]).toMatchObject({
      title: "GitHub",
      url: "https://github.com/",
    })
    expect(bare?.[0]).toMatchObject({ url: "https://example.com/path" })
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

describe("tryAddShortcutFolder", () => {
  test("creates an empty single-level folder after existing cells", () => {
    // Given
    const existing = tryAddShortcutItem({
      title: "GitHub",
      url: "https://github.com",
      existing: [],
      now: 10,
    })
    expect(existing).not.toBeNull()

    // When
    const withFolder = tryAddShortcutFolder({
      title: "工作",
      existing: existing ?? [],
      now: 11,
    })

    // Then
    expect(withFolder).toHaveLength(2)
    expect(withFolder?.[1]).toEqual({ id: "f_b", title: "工作", items: [] })
  })

  test("rejects blank folder titles", () => {
    expect(
      tryAddShortcutFolder({ title: "  ", existing: [], now: 12 }),
    ).toBeNull()
  })
})

describe("tryAddShortcutItem into folders", () => {
  test("appends a validated shortcut into the targeted folder only", () => {
    // Given
    const withFolder = tryAddShortcutFolder({
      title: "工作",
      existing: [],
      now: 20,
    })
    const withTopLink = tryAddShortcutItem({
      title: "Top",
      url: "https://top.example.com",
      existing: withFolder ?? [],
      now: 21,
    })

    // When
    const next = tryAddShortcutItem({
      title: "Mail",
      url: "mail.example.com",
      existing: withTopLink ?? [],
      folderId: "f_k",
      now: 22,
    })

    // Then: the folder gains one member, the top-level link is untouched
    expect(next).toHaveLength(2)
    expect(next?.[0]).toMatchObject({
      id: "f_k",
      items: [
        {
          id: "s_m",
          title: "Mail",
          url: "https://mail.example.com/",
        },
      ],
    })
    expect(next?.[1]).toMatchObject({ title: "Top" })
  })

  test("rejects unsafe urls even when targeting a folder", () => {
    // Given
    const withFolder = tryAddShortcutFolder({
      title: "工作",
      existing: [],
      now: 30,
    })

    // When
    const next = tryAddShortcutItem({
      title: "Evil",
      url: "javascript:alert(1)",
      existing: withFolder ?? [],
      folderId: "f_u",
      now: 31,
    })

    // Then
    expect(next).toBeNull()
  })
})
