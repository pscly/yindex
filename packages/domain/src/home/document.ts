import {
  type PageId,
  type WidgetInstanceId,
  createId,
  pageId,
  widgetInstanceId,
  widgetTypeId,
} from "../ids/ids"
import { clampRect, withZ } from "../layout/layout"
import type { LayoutRect, RectPct } from "../layout/types"
import { type Result, err, ok } from "../result/result"
import {
  type PageSequence,
  createSequence,
  insertPage,
  removePage,
  reorderPage,
  setLanding,
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

import type { HomeError } from "./errors"
import { createBlankPage } from "./factory"
export type { HomeError } from "./errors"

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

export function addBlankPageToHome(
  doc: HomeDocument,
  sourcePageId: PageId,
): Result<HomeDocument, HomeError> {
  const sourcePageR = getPage(doc, sourcePageId)
  if (!sourcePageR.ok) return sourcePageR
  return addPageToHome(
    doc,
    createBlankPage({
      name: "新页面",
      icon: "页",
      style: sourcePageR.value.style,
    }),
  )
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
    return err({
      code: "widget_not_found",
      message: `widget not found: ${widgetId}`,
    })
  }
  const clamped = clampRect(rect)
  const layout: LayoutRect = withZ(clamped, z ?? widget.layout.z)
  return updatePage(doc, pageId, (p) => ({
    ...p,
    widgets: p.widgets.map((w) => (w.id === widgetId ? { ...w, layout } : w)),
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
    return err({
      code: "widget_not_found",
      message: `widget not found: ${widgetId}`,
    })
  }
  return updatePage(doc, pageId, (p) => ({
    ...p,
    widgets: p.widgets.filter((w) => w.id !== widgetId),
  }))
}
