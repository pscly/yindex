import {
  createId,
  pageId,
  type PageId,
  type WidgetInstanceId,
  widgetInstanceId,
  widgetTypeId,
} from "../ids/ids"
import { clampRect, withZ } from "../layout/layout"
import type { LayoutRect, RectPct } from "../layout/types"
import { err, ok, type Result } from "../result/result"
import {
  createSequence,
  insertPage,
  removePage,
  reorderPage,
  setLanding,
  type PageSequence,
} from "../sequence/sequence"
import type { PageStyle, WidgetStyleOverride } from "../style/types"
import {
  HOME_SCHEMA_VERSION,
  type HomeDocument,
  type HomeSettings,
  type Page,
  type WidgetInstance,
  type WidgetSource,
} from "./types"

export type HomeError =
  | { readonly code: "page_not_found"; readonly message: string }
  | { readonly code: "widget_not_found"; readonly message: string }
  | { readonly code: "sequence"; readonly message: string }
  | { readonly code: "invalid"; readonly message: string }

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  rememberLastPage: false,
  allowHexagramRedraw: false,
  snapEnabled: true,
  reducedMotion: "system",
  locale: "zh-CN",
}

export function getPage(
  doc: HomeDocument,
  id: PageId,
): Result<Page, HomeError> {
  const page = doc.pages[id]
  if (!page) {
    return err({ code: "page_not_found", message: `page not found: ${id}` })
  }
  return ok(page)
}

export function updatePage(
  doc: HomeDocument,
  id: PageId,
  updater: (page: Page) => Page,
): Result<HomeDocument, HomeError> {
  const pageR = getPage(doc, id)
  if (!pageR.ok) return pageR
  return ok({
    ...doc,
    pages: { ...doc.pages, [id]: updater(pageR.value) },
  })
}

export function addPageToHome(
  doc: HomeDocument,
  page: Page,
  atIndex?: number,
): Result<HomeDocument, HomeError> {
  if (doc.pages[page.id]) {
    return err({ code: "invalid", message: `page already exists: ${page.id}` })
  }
  const index = atIndex ?? doc.sequence.pageIds.length
  const seqR = insertPage(doc.sequence, page.id, index)
  if (!seqR.ok) {
    return err({ code: "sequence", message: seqR.error.message })
  }
  return ok({
    ...doc,
    sequence: seqR.value,
    pages: { ...doc.pages, [page.id]: page },
  })
}

export function deletePageFromHome(
  doc: HomeDocument,
  id: PageId,
): Result<HomeDocument, HomeError> {
  const seqR = removePage(doc.sequence, id)
  if (!seqR.ok) {
    return err({ code: "sequence", message: seqR.error.message })
  }
  const { [id]: _removed, ...rest } = doc.pages
  let lastPageId = doc.lastPageId
  if (lastPageId === id) lastPageId = seqR.value.landingPageId
  return ok({
    ...doc,
    sequence: seqR.value,
    pages: rest,
    lastPageId,
  })
}

export function reorderPageInHome(
  doc: HomeDocument,
  id: PageId,
  toIndex: number,
): Result<HomeDocument, HomeError> {
  const seqR = reorderPage(doc.sequence, id, toIndex)
  if (!seqR.ok) {
    return err({ code: "sequence", message: seqR.error.message })
  }
  return ok({ ...doc, sequence: seqR.value })
}

export function setLandingPage(
  doc: HomeDocument,
  id: PageId,
): Result<HomeDocument, HomeError> {
  const seqR = setLanding(doc.sequence, id)
  if (!seqR.ok) {
    return err({ code: "sequence", message: seqR.error.message })
  }
  return ok({ ...doc, sequence: seqR.value })
}

export function setLastPageId(
  doc: HomeDocument,
  id: PageId | null,
): HomeDocument {
  return { ...doc, lastPageId: id }
}

export function setPageStyle(
  doc: HomeDocument,
  id: PageId,
  style: PageStyle,
): Result<HomeDocument, HomeError> {
  return updatePage(doc, id, (p) => ({ ...p, style }))
}

export function setPageMeta(
  doc: HomeDocument,
  id: PageId,
  meta: { readonly name?: string; readonly icon?: string },
): Result<HomeDocument, HomeError> {
  return updatePage(doc, id, (p) => ({
    ...p,
    name: meta.name ?? p.name,
    icon: meta.icon ?? p.icon,
  }))
}

export function addWidget(
  doc: HomeDocument,
  pageId: PageId,
  widget: WidgetInstance,
): Result<HomeDocument, HomeError> {
  return updatePage(doc, pageId, (p) => ({
    ...p,
    widgets: [...p.widgets, widget],
  }))
}

export function updateWidget(
  doc: HomeDocument,
  pageId: PageId,
  widgetId: WidgetInstanceId,
  updater: (w: WidgetInstance) => WidgetInstance,
): Result<HomeDocument, HomeError> {
  const pageR = getPage(doc, pageId)
  if (!pageR.ok) return pageR
  if (!pageR.value.widgets.some((w) => w.id === widgetId)) {
    return err({
      code: "widget_not_found",
      message: `widget not found: ${widgetId}`,
    })
  }
  return updatePage(doc, pageId, (p) => ({
    ...p,
    widgets: p.widgets.map((w) => (w.id === widgetId ? updater(w) : w)),
  }))
}

export function setWidgetLayout(
  doc: HomeDocument,
  pageId: PageId,
  widgetId: WidgetInstanceId,
  rect: RectPct,
  z?: number,
): Result<HomeDocument, HomeError> {
  const pageR = getPage(doc, pageId)
  if (!pageR.ok) return pageR
  const widget = pageR.value.widgets.find((w) => w.id === widgetId)
  if (!widget) {
    return err({ code: "widget_not_found", message: `widget not found: ${widgetId}` })
  }
  const clamped = clampRect(rect)
  const layout: LayoutRect = withZ(clamped, z ?? widget.layout.z)
  return updatePage(doc, pageId, (p) => ({
    ...p,
    widgets: p.widgets.map((w) =>
      w.id === widgetId ? { ...w, layout } : w,
    ),
  }))
}

export function removeWidget(
  doc: HomeDocument,
  pageId: PageId,
  widgetId: WidgetInstanceId,
): Result<HomeDocument, HomeError> {
  const pageR = getPage(doc, pageId)
  if (!pageR.ok) return pageR
  if (!pageR.value.widgets.some((w) => w.id === widgetId)) {
    return err({ code: "widget_not_found", message: `widget not found: ${widgetId}` })
  }
  return updatePage(doc, pageId, (p) => ({
    ...p,
    widgets: p.widgets.filter((w) => w.id !== widgetId),
  }))
}

export function markPackageMissing(
  doc: HomeDocument,
  packageId: string,
): HomeDocument {
  const pages: Record<string, Page> = {}
  for (const [id, page] of Object.entries(doc.pages)) {
    pages[id] = {
      ...page,
      widgets: page.widgets.map((w) => {
        if (w.source.kind === "package" && w.source.packageId === packageId) {
          return {
            ...w,
            source: {
              kind: "missing" as const,
              packageId: w.source.packageId,
              typeId: w.source.typeId,
              lastPackageVersion: w.source.packageVersion,
              savedConfig: w.config,
            },
          }
        }
        return w
      }),
    }
  }
  return { ...doc, pages }
}

export function restorePackageInstances(
  doc: HomeDocument,
  packageId: string,
  packageVersion: string,
): HomeDocument {
  const pages: Record<string, Page> = {}
  for (const [id, page] of Object.entries(doc.pages)) {
    pages[id] = {
      ...page,
      widgets: page.widgets.map((w) => {
        if (w.source.kind === "missing" && w.source.packageId === packageId) {
          return {
            ...w,
            config: w.source.savedConfig,
            source: {
              kind: "package" as const,
              packageId: w.source.packageId,
              typeId: w.source.typeId,
              packageVersion,
            },
          }
        }
        return w
      }),
    }
  }
  return { ...doc, pages }
}

export function createWidgetInstance(input: {
  readonly source: WidgetSource
  readonly layout: LayoutRect
  readonly config?: unknown
  readonly styleOverride?: WidgetStyleOverride | null
}): WidgetInstance {
  return {
    id: widgetInstanceId(createId("w")),
    source: input.source,
    layout: input.layout,
    config: input.config ?? {},
    styleOverride: input.styleOverride ?? null,
  }
}

export function createBlankPage(input: {
  readonly name: string
  readonly icon?: string
  readonly style: PageStyle
}): Page {
  return {
    id: pageId(createId("page")),
    name: input.name,
    icon: input.icon ?? "◇",
    style: input.style,
    widgets: [],
  }
}

export function buildHomeDocument(input: {
  readonly pages: readonly Page[]
  readonly landingPageId?: PageId
  readonly settings?: Partial<HomeSettings>
}): Result<HomeDocument, HomeError> {
  if (input.pages.length === 0) {
    return err({ code: "invalid", message: "at least one page required" })
  }
  const pageIds = input.pages.map((p) => p.id)
  const seqR = createSequence(pageIds, input.landingPageId)
  if (!seqR.ok) {
    return err({ code: "sequence", message: seqR.error.message })
  }
  const pages: Record<string, Page> = {}
  for (const p of input.pages) {
    pages[p.id] = p
  }
  return ok({
    schemaVersion: HOME_SCHEMA_VERSION,
    sequence: seqR.value,
    pages,
    settings: { ...DEFAULT_HOME_SETTINGS, ...input.settings },
    lastPageId: null,
  })
}

export function builtinSource(type: string): WidgetSource {
  return { kind: "builtin", typeId: widgetTypeId(type) }
}

export type { PageSequence }
