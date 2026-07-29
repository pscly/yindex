import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  faviconForUrl,
  openShortcutIfSafe,
  safeShortcutHref,
} from "./ShortcutsWidget"

describe("faviconForUrl", () => {
  test("parses host", () => {
    expect(faviconForUrl("https://github.com/foo")).toContain("github.com")
  })
  test("invalid", () => {
    expect(faviconForUrl("not a url")).toBeUndefined()
  })
})

describe("safeShortcutHref", () => {
  test("allows https and http shortcut targets", () => {
    expect(String(safeShortcutHref("https://github.com/foo"))).toBe(
      "https://github.com/foo",
    )
    expect(String(safeShortcutHref("http://example.com"))).toBe(
      "http://example.com/",
    )
  })

  test("rejects imported javascript shortcut PoC", () => {
    // Given / When / Then: imported hostile schemes never become hrefs
    expect(safeShortcutHref("javascript:alert(1)")).toBeNull()
  })

  test("rejects data, file, and blob shortcut schemes", () => {
    expect(safeShortcutHref("data:text/html,<h1>x")).toBeNull()
    expect(safeShortcutHref("file:///etc/passwd")).toBeNull()
    expect(safeShortcutHref("blob:https://example.com/uuid")).toBeNull()
  })
})

describe("Shortcuts mounted navigation sink", () => {
  test("click path never opens unsafe imported javascript shortcuts", () => {
    // Given
    const opened: string[] = []

    // When: the same open path ShortcutsWidget uses on click runs
    const href = openShortcutIfSafe("javascript:alert(1)", (url) => {
      opened.push(url)
    })

    // Then
    expect(href).toBeNull()
    expect(opened).toEqual([])
  })

  test("click path opens only safe https targets via the shared boundary", () => {
    // Given
    const opened: string[] = []

    // When
    const href = openShortcutIfSafe("https://github.com/foo", (url) => {
      opened.push(url)
    })

    // Then
    expect(String(href)).toBe("https://github.com/foo")
    expect(opened).toEqual(["https://github.com/foo"])
  })

  test("ShortcutsWidget source never binds raw item.url to href or onOpen", () => {
    // Given / When
    const source = readFileSync(
      join(import.meta.dir, "ShortcutsWidget.tsx"),
      "utf8",
    )

    // Then
    expect(source).toContain("openShortcutIfSafe")
    expect(source).toContain("safeShortcutHref")
    expect(source).not.toMatch(/href=\{item\.url\}/)
    expect(source).not.toMatch(/onOpen\(item\.url\)/)
    expect(source).toContain("parseSafeNavigationUrl")
  })
})
