import { describe, expect, test } from "bun:test"
import {
  FOLDER_PREVIEW_LIMIT,
  folderPreviewItems,
  isShortcutCell,
  isShortcutFolder,
  isShortcutItem,
  isShortcutsWidgetConfig,
  resolveShortcutIcon,
  shortcutFallbackHue,
  shortcutFallbackPalette,
} from "./shortcutsModel"

const shortcut = {
  id: "s1",
  title: "Docs",
  url: "https://example.com/docs",
} as const

const folder = {
  id: "f1",
  title: "工作",
  items: [shortcut],
} as const

describe("isShortcutItem", () => {
  test("accepts a plain shortcut with optional favicon", () => {
    expect(isShortcutItem(shortcut)).toBe(true)
    expect(isShortcutItem({ ...shortcut, favicon: "x.png" })).toBe(true)
  })

  test("rejects folders and malformed records", () => {
    expect(isShortcutItem(folder)).toBe(false)
    expect(isShortcutItem({ id: "s1", title: "Docs" })).toBe(false)
    expect(isShortcutItem(null)).toBe(false)
  })
})

describe("isShortcutFolder", () => {
  test("accepts a single-level folder of shortcuts", () => {
    expect(isShortcutFolder(folder)).toBe(true)
    expect(isShortcutFolder({ ...folder, items: [] })).toBe(true)
  })

  test("rejects nested folders: members must be plain shortcuts", () => {
    // Given: a folder whose member is itself a folder (no url of its own)
    const nested = { id: "f2", title: "嵌套", items: [folder] }

    // When / Then
    expect(isShortcutFolder(nested)).toBe(false)
    expect(isShortcutCell(nested)).toBe(false)
  })

  test("rejects records that are really shortcuts or malformed", () => {
    expect(isShortcutFolder(shortcut)).toBe(false)
    expect(isShortcutFolder({ id: "f1", title: "工作" })).toBe(false)
    expect(isShortcutFolder({ ...folder, items: "links" })).toBe(false)
  })
})

describe("isShortcutsWidgetConfig", () => {
  test("keeps backward tolerance for plain shortcut arrays", () => {
    // Given: a pre-folder config with only plain shortcuts
    const legacy = { items: [shortcut, { ...shortcut, id: "s2" }] }

    // When / Then
    expect(isShortcutsWidgetConfig(legacy)).toBe(true)
  })

  test("accepts mixed shortcut and folder cells", () => {
    expect(isShortcutsWidgetConfig({ items: [shortcut, folder] })).toBe(true)
  })

  test("rejects configs containing nested folders or junk cells", () => {
    expect(
      isShortcutsWidgetConfig({
        items: [{ id: "f2", title: "x", items: [folder] }],
      }),
    ).toBe(false)
    expect(isShortcutsWidgetConfig({ items: [42] })).toBe(false)
    expect(isShortcutsWidgetConfig({ items: "links" })).toBe(false)
  })
})

describe("resolveShortcutIcon", () => {
  test("maps retired Google s2 favicons to the local _favicon mechanism", () => {
    // Given: a config stored when the Google service was the icon source
    const legacyItem = {
      ...shortcut,
      favicon: "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    }

    // When
    const icon = resolveShortcutIcon(legacyItem)

    // Then
    expect(icon).toContain("_favicon/?pageUrl=")
    expect(icon).not.toContain("google.com")
  })

  test("keeps non-Google stored favicons as explicit overrides", () => {
    const item = { ...shortcut, favicon: "data:image/png;base64,xx" }
    expect(resolveShortcutIcon(item)).toBe("data:image/png;base64,xx")
  })
})

describe("shortcutFallbackPalette", () => {
  test("is deterministic per hostname and muted oklch pastel", () => {
    // Given / When
    const a = shortcutFallbackPalette("https://github.com/foo")
    const b = shortcutFallbackPalette("https://github.com/bar")

    // Then
    expect(a).toEqual(b)
    expect(a.background).toMatch(/^oklch\(0\.84 0\.07 \d+\)$/)
    expect(a.foreground).toMatch(/^oklch\(0\.38 0\.09 \d+\)$/)
  })

  test("hue derivation stays inside the color wheel", () => {
    for (const host of ["a.com", "github.com", "例え.jp", "x"]) {
      const hue = shortcutFallbackHue(`https://${host}/`)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})

describe("folderPreviewItems", () => {
  test("caps the 2×2 preview at four members and keeps order", () => {
    // Given
    const members = [1, 2, 3, 4, 5, 6].map((n) => ({
      id: `s${n}`,
      title: `T${n}`,
      url: "https://example.com",
    }))
    const bigFolder = { id: "f1", title: "多", items: members }

    // When / Then
    expect(folderPreviewItems(bigFolder)).toHaveLength(FOLDER_PREVIEW_LIMIT)
    expect(folderPreviewItems(bigFolder).map((m) => m.id)).toEqual([
      "s1",
      "s2",
      "s3",
      "s4",
    ])
  })

  test("fewer than four members yield fewer preview cells", () => {
    expect(folderPreviewItems(folder)).toHaveLength(1)
    expect(folderPreviewItems({ ...folder, items: [] })).toHaveLength(0)
  })
})
