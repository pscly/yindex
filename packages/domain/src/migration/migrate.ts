import { z } from "zod"
import { pageId } from "../ids/ids"
import { HOME_SCHEMA_VERSION, type HomeDocument } from "../home/types"
import { err, ok, type Result } from "../result/result"

export type MigrationError = {
  readonly code: "unsupported" | "parse" | "corrupt"
  readonly message: string
  readonly raw?: unknown
}

const layoutRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  z: z.number(),
})

const styleOverrideSchema = z
  .object({
    color: z.record(z.string()).optional(),
    typography: z.record(z.union([z.string(), z.number()])).optional(),
    space: z.record(z.number()).optional(),
    radius: z.record(z.string()).optional(),
    elevation: z.record(z.string()).optional(),
    glass: z.record(z.union([z.number(), z.boolean()])).optional(),
    wallpaper: z.record(z.union([z.string(), z.number()])).optional(),
    motion: z.record(z.union([z.string(), z.number()])).optional(),
  })
  .partial()

const widgetSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("builtin"),
    typeId: z.string(),
  }),
  z.object({
    kind: z.literal("package"),
    packageId: z.string(),
    typeId: z.string(),
    packageVersion: z.string(),
  }),
  z.object({
    kind: z.literal("missing"),
    packageId: z.string(),
    typeId: z.string(),
    lastPackageVersion: z.string(),
    savedConfig: z.unknown(),
  }),
])

const widgetInstanceSchema = z.object({
  id: z.string(),
  source: widgetSourceSchema,
  layout: layoutRectSchema,
  config: z.unknown(),
  styleOverride: styleOverrideSchema.nullable(),
})

const pageStyleSchema = z.object({
  packId: z.string(),
  overrides: styleOverrideSchema.default({}),
})

const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  style: pageStyleSchema,
  widgets: z.array(widgetInstanceSchema),
})

const homeV1Schema = z.object({
  schemaVersion: z.literal(1),
  sequence: z.object({
    pageIds: z.array(z.string()).min(1),
    landingPageId: z.string(),
  }),
  pages: z.record(pageSchema),
  settings: z.object({
    rememberLastPage: z.boolean(),
    allowHexagramRedraw: z.boolean(),
    snapEnabled: z.boolean(),
    showWidgetTitles: z.boolean().default(true),
    reducedMotion: z.enum(["system", "force", "never"]),
    locale: z.literal("zh-CN"),
  }),
  lastPageId: z.string().nullable(),
})

function brandDocument(raw: z.infer<typeof homeV1Schema>): HomeDocument {
  const pages: Record<string, HomeDocument["pages"][string]> = {}
  for (const [key, page] of Object.entries(raw.pages)) {
    pages[key] = {
      id: pageId(page.id),
      name: page.name,
      icon: page.icon,
      style: {
        packId: page.style.packId as HomeDocument["pages"][string]["style"]["packId"],
        overrides: page.style.overrides as HomeDocument["pages"][string]["style"]["overrides"],
      },
      widgets: page.widgets.map((w) => ({
        id: w.id as HomeDocument["pages"][string]["widgets"][number]["id"],
        source: w.source as HomeDocument["pages"][string]["widgets"][number]["source"],
        layout: w.layout,
        config: w.config,
        styleOverride: w.styleOverride as HomeDocument["pages"][string]["widgets"][number]["styleOverride"],
      })),
    }
  }
  return {
    schemaVersion: HOME_SCHEMA_VERSION,
    sequence: {
      pageIds: raw.sequence.pageIds.map(pageId),
      landingPageId: pageId(raw.sequence.landingPageId),
    },
    pages: pages,
    settings: {
      ...raw.settings,
      showWidgetTitles: raw.settings.showWidgetTitles ?? true,
    },
    lastPageId: raw.lastPageId ? pageId(raw.lastPageId) : null,
  }
}

/**
 * Parse + migrate stored JSON into current HomeDocument.
 * On failure returns raw payload for recovery UI (product rule).
 */
export function migrateHomeDocument(
  raw: unknown,
): Result<HomeDocument, MigrationError> {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return err({ code: "parse", message: "home document is not an object", raw })
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (version === undefined) {
    return err({ code: "parse", message: "missing schemaVersion", raw })
  }
  if (typeof version !== "number") {
    return err({ code: "parse", message: "schemaVersion must be number", raw })
  }
  if (version > HOME_SCHEMA_VERSION) {
    return err({
      code: "unsupported",
      message: `schemaVersion ${version} is newer than supported ${HOME_SCHEMA_VERSION}`,
      raw,
    })
  }
  if (version < 1) {
    return err({ code: "unsupported", message: `unknown schemaVersion ${version}`, raw })
  }
  // v1 only for now; future: chain migrations 1→2→…
  const parsed = homeV1Schema.safeParse(raw)
  if (!parsed.success) {
    return err({
      code: "corrupt",
      message: parsed.error.issues.map((i) => i.message).join("; "),
      raw,
    })
  }
  // Integrity: every sequence id must exist in pages
  for (const id of parsed.data.sequence.pageIds) {
    if (!parsed.data.pages[id]) {
      return err({
        code: "corrupt",
        message: `sequence references missing page ${id}`,
        raw,
      })
    }
  }
  if (!parsed.data.pages[parsed.data.sequence.landingPageId]) {
    return err({
      code: "corrupt",
      message: "landing page missing from pages map",
      raw,
    })
  }
  return ok(brandDocument(parsed.data))
}

export function serializeHomeDocument(doc: HomeDocument): unknown {
  // structured clone via JSON boundary
  return JSON.parse(JSON.stringify(doc)) as unknown
}
