import {
  type PageId,
  createId,
  pageId,
  widgetInstanceId,
  widgetTypeId,
} from "../ids/ids"
import type { LayoutRect } from "../layout/types"
import { type Result, err, ok } from "../result/result"
import { createSequence } from "../sequence/sequence"
import { defaultPageStyle } from "../style/pageStyle"
import type { PageStyle, WidgetStyleOverride } from "../style/types"
import type { HomeError } from "./errors"
import {
  DEFAULT_HOME_SETTINGS,
  HOME_SCHEMA_VERSION,
  type HomeDocument,
  type HomeSettings,
  type Page,
  type WidgetInstance,
  type WidgetSource,
} from "./types"

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
  readonly style?: PageStyle
}): Page {
  return {
    id: pageId(createId("page")),
    name: input.name,
    icon: input.icon ?? "◇",
    style: input.style ?? defaultPageStyle(),
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
