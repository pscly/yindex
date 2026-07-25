import { describe, expect, test } from "bun:test"
import { packageId, widgetTypeId } from "../ids/ids"
import { withZ } from "../layout/layout"
import { defaultPageStyle } from "../style/pageStyle"
import { wallpaperDim } from "../style/wallpaper"
import {
  addBlankPageToHome,
  addPageToHome,
  addWidget,
  deletePageFromHome,
  removeWidget,
  setWidgetLayout,
} from "./document"
import {
  buildHomeDocument,
  builtinSource,
  createBlankPage,
  createWidgetInstance,
} from "./factory"
import { markPackageMissing, restorePackageInstances } from "./packageLifecycle"
import { HOME_SCHEMA_VERSION } from "./types"

function blank(name: string) {
  return createBlankPage({
    name,
    style: defaultPageStyle(),
  })
}

describe("HomeDocument", () => {
  test("Blank Page copies the current Page Style with zero Widgets", () => {
    // Given — a non-default mood and palette distinguish copying from fallback
    const sourcePalette = {
      bg: "copied-bg",
      surface: "copied-surface",
      ink: "copied-ink",
      muted: "copied-muted",
      accent: "copied-accent",
    }
    const defaults = defaultPageStyle()
    const sourceWallpaper = { ...defaults.wallpaper }
    const sourceGlassTuning = { ...defaults.glassTuning }
    const currentStyle = {
      ...defaults,
      typographyMood: "serif" as const,
      seedPalette: sourcePalette,
      wallpaper: sourceWallpaper,
      glassTuning: sourceGlassTuning,
    }

    const currentPage = {
      ...createBlankPage({ name: "当前页" }),
      style: currentStyle,
    }
    const existingWidget = createWidgetInstance({
      source: builtinSource("builtin.clock"),
      layout: withZ({ x: 10, y: 10, w: 30, h: 20 }, 1),
    })
    const docR = buildHomeDocument({
      pages: [{ ...currentPage, widgets: [existingWidget] }],
    })
    if (!docR.ok) throw new Error("doc")

    // When
    const result = addBlankPageToHome(docR.value, currentPage.id)

    // Then
    expect(result.ok).toBe(true)
    if (result.ok) {
      const addedId = result.value.sequence.pageIds[1]
      const page = addedId ? result.value.pages[addedId] : undefined
      expect(page?.style).toEqual(currentStyle)
      expect(page?.style).not.toBe(currentStyle)
      expect(page?.style.seedPalette).not.toBe(currentStyle.seedPalette)
      expect(page?.style.wallpaper).not.toBe(currentStyle.wallpaper)
      expect(page?.style.glassTuning).not.toBe(currentStyle.glassTuning)
      expect(page?.widgets).toEqual([])

      sourcePalette.accent = "mutated-after-creation"
      const changedDim = wallpaperDim(0.91)
      if (!changedDim.ok) throw new Error("test wallpaper dim")
      sourceWallpaper.dim = changedDim.value
      sourceGlassTuning.blur = 11
      expect(page?.style.seedPalette.accent).toBe("copied-accent")
      expect(page?.style.wallpaper.dim).toBe(defaults.wallpaper.dim)
      expect(page?.style.glassTuning.blur).toBe(defaults.glassTuning.blur)
    }
  })

  test("build requires pages and emits schema v2", () => {
    // Given / When
    const empty = buildHomeDocument({ pages: [] })
    const page = blank("启动")
    const okDoc = buildHomeDocument({ pages: [page] })
    // Then
    expect(empty.ok).toBe(false)
    expect(okDoc.ok).toBe(true)
    if (okDoc.ok) {
      expect(okDoc.value.schemaVersion).toBe(HOME_SCHEMA_VERSION)
      expect(okDoc.value.schemaVersion).toBe(2)
      expect(okDoc.value.settings.motionProfile).toBe("balanced")
    }
  })

  test("add widget and move layout", () => {
    const p = blank("启动")
    const docR = buildHomeDocument({ pages: [p] })
    if (!docR.ok) throw new Error("doc")
    const w = createWidgetInstance({
      source: builtinSource("builtin.clock"),
      layout: withZ({ x: 10, y: 10, w: 30, h: 20 }, 1),
    })
    const withW = addWidget(docR.value, p.id, w)
    if (!withW.ok) throw new Error("add")
    const moved = setWidgetLayout(withW.value, p.id, w.id, {
      x: 20,
      y: 20,
      w: 30,
      h: 20,
    })
    expect(moved.ok).toBe(true)
    if (moved.ok) {
      const page = moved.value.pages[p.id]
      expect(page?.widgets[0]?.layout.x).toBe(20)
    }
  })

  test("cannot delete last page", () => {
    const p = blank("only")
    const docR = buildHomeDocument({ pages: [p] })
    if (!docR.ok) throw new Error("doc")
    const r = deletePageFromHome(docR.value, p.id)
    expect(r.ok).toBe(false)
  })

  test("package missing and restore", () => {
    const p = blank("p")
    const w = createWidgetInstance({
      source: {
        kind: "package",
        packageId: packageId("com.example.pomodoro"),
        typeId: widgetTypeId("pomodoro.timer"),
        packageVersion: "1.0.0",
      },
      layout: withZ({ x: 10, y: 10, w: 20, h: 20 }, 1),
      config: { minutes: 25 },
    })
    const docR = buildHomeDocument({ pages: [{ ...p, widgets: [w] }] })
    if (!docR.ok) throw new Error("doc")
    const missing = markPackageMissing(docR.value, "com.example.pomodoro")
    const src = missing.pages[p.id]?.widgets[0]?.source
    expect(src?.kind).toBe("missing")
    const restored = restorePackageInstances(
      missing,
      "com.example.pomodoro",
      "1.0.1",
    )
    const src2 = restored.pages[p.id]?.widgets[0]?.source
    expect(src2?.kind).toBe("package")
    if (src2?.kind === "package") {
      expect(src2.packageVersion).toBe("1.0.1")
    }
  })

  test("remove widget", () => {
    const p = blank("p")
    const w = createWidgetInstance({
      source: builtinSource("builtin.search"),
      layout: withZ({ x: 10, y: 10, w: 40, h: 10 }, 1),
    })
    const docR = buildHomeDocument({ pages: [{ ...p, widgets: [w] }] })
    if (!docR.ok) throw new Error("doc")
    const r = removeWidget(docR.value, p.id, w.id)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.pages[p.id]?.widgets).toEqual([])
  })

  test("add second page", () => {
    const p1 = blank("a")
    const p2 = blank("b")
    const docR = buildHomeDocument({ pages: [p1] })
    if (!docR.ok) throw new Error("doc")
    const r = addPageToHome(docR.value, p2)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.sequence.pageIds.length).toBe(2)
  })
})
