import { describe, expect, test } from "bun:test"
import { packageId, stylePackId, widgetTypeId } from "../ids/ids"
import { withZ } from "../layout/layout"
import {
  addPageToHome,
  addWidget,
  buildHomeDocument,
  createBlankPage,
  createWidgetInstance,
  deletePageFromHome,
  markPackageMissing,
  removeWidget,
  restorePackageInstances,
  setWidgetLayout,
  builtinSource,
} from "./document"

function blank(name: string) {
  return createBlankPage({
    name,
    style: { packId: stylePackId("caliper"), overrides: {} },
  })
}

describe("HomeDocument", () => {
  test("build requires pages", () => {
    const r = buildHomeDocument({ pages: [] })
    expect(r.ok).toBe(false)
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
    const restored = restorePackageInstances(missing, "com.example.pomodoro", "1.0.1")
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
