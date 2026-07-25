import {
  HOME_SCHEMA_VERSION,
  type HomeDocument,
  type WidgetSource,
} from "../home/types"
import { brandAs } from "../ids/brand"
import { packageId, pageId, widgetInstanceId, widgetTypeId } from "../ids/ids"
import { type Result, err, ok } from "../result/result"
import { assertNever } from "../result/result"
import type { SeedPalette, WidgetStyleOverride } from "../style/types"
import type { Wallpaper } from "../style/wallpaper"
import {
  type HomeV2Raw,
  type SeedPaletteRaw,
  type WallpaperRaw,
  homeV2Schema,
} from "./homeV2Schema"

export type MigrationError = {
  readonly code: "unsupported" | "parse" | "corrupt"
  readonly message: string
  readonly raw?: unknown
}

function brandWallpaper(raw: WallpaperRaw): Wallpaper {
  const dim = brandAs<number, "WallpaperDim">(raw.dim)
  switch (raw.kind) {
    case "generative":
      return {
        kind: "generative",
        generativePreset: raw.generativePreset,
        dim,
      }
    case "image":
      return {
        kind: "image",
        mediaRef: brandAs<string, "MediaRef">(raw.mediaRef),
        dim,
      }
    case "video":
      return {
        kind: "video",
        mediaRef: brandAs<string, "MediaRef">(raw.mediaRef),
        dim,
      }
    default: {
      const _exhaustive: never = raw
      return _exhaustive
    }
  }
}

function brandSeedPalette(raw: SeedPaletteRaw): SeedPalette {
  return raw
}

function isWidgetStyleOverride(value: unknown): value is WidgetStyleOverride {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function brandStyleOverride(
  raw: HomeV2Raw["pages"][string]["widgets"][number]["styleOverride"],
): WidgetStyleOverride | null {
  if (raw === null) return null
  const cloned: unknown = JSON.parse(JSON.stringify(raw))
  if (!isWidgetStyleOverride(cloned)) return null
  return cloned
}

function brandWidgetSource(
  raw: HomeV2Raw["pages"][string]["widgets"][number]["source"],
): WidgetSource {
  switch (raw.kind) {
    case "builtin":
      return { kind: "builtin", typeId: widgetTypeId(raw.typeId) }
    case "package":
      return {
        kind: "package",
        packageId: packageId(raw.packageId),
        typeId: widgetTypeId(raw.typeId),
        packageVersion: raw.packageVersion,
      }
    case "missing":
      return {
        kind: "missing",
        packageId: packageId(raw.packageId),
        typeId: widgetTypeId(raw.typeId),
        lastPackageVersion: raw.lastPackageVersion,
        savedConfig: raw.savedConfig,
      }
    default:
      return assertNever(raw)
  }
}

function brandDocument(raw: HomeV2Raw): HomeDocument {
  const pages: Record<string, HomeDocument["pages"][string]> = {}
  for (const [key, page] of Object.entries(raw.pages)) {
    pages[key] = {
      id: pageId(page.id),
      name: page.name,
      icon: page.icon,
      style: {
        seedPalette: brandSeedPalette(page.style.seedPalette),
        wallpaper: brandWallpaper(page.style.wallpaper),
        typographyMood: page.style.typographyMood,
        glassProfile: page.style.glassProfile,
        glassTuning: page.style.glassTuning,
      },
      widgets: page.widgets.map((w) => ({
        id: widgetInstanceId(w.id),
        source: brandWidgetSource(w.source),
        layout: w.layout,
        config: w.config,
        styleOverride: brandStyleOverride(w.styleOverride),
      })),
    }
  }
  return {
    schemaVersion: HOME_SCHEMA_VERSION,
    sequence: {
      pageIds: raw.sequence.pageIds.map(pageId),
      landingPageId: pageId(raw.sequence.landingPageId),
    },
    pages,
    settings: {
      ...raw.settings,
      showWidgetTitles: raw.settings.showWidgetTitles ?? false,
      motionProfile: raw.settings.motionProfile ?? "balanced",
    },
    lastPageId: raw.lastPageId ? pageId(raw.lastPageId) : null,
  }
}

/**
 * Parse stored JSON into current HomeDocument (schema v2 only).
 * v1 and unknown versions are unsupported (ADR 0010) — storage layer resets.
 * Corrupt v2 still returns `corrupt` with raw for recovery UI.
 */
export function migrateHomeDocument(
  raw: unknown,
): Result<HomeDocument, MigrationError> {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return err({
      code: "parse",
      message: "home document is not an object",
      raw,
    })
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
  // ADR 0010: no v1 (or pre-v2) migration path — treat as unsupported so storage resets.
  if (version < HOME_SCHEMA_VERSION) {
    return err({
      code: "unsupported",
      message: `schemaVersion ${version} is no longer supported; reset to default Home (ADR 0010)`,
      raw,
    })
  }

  const parsed = homeV2Schema.safeParse(raw)
  if (!parsed.success) {
    return err({
      code: "corrupt",
      message: parsed.error.issues.map((i) => i.message).join("; "),
      raw,
    })
  }
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
  return JSON.parse(JSON.stringify(doc))
}
