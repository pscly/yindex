import { describe, expect, test } from "bun:test"
import { buildHomeDocument, createBlankPage } from "../home/factory"
import { HOME_SCHEMA_VERSION } from "../home/types"
import { defaultPageStyle } from "../style/pageStyle"
import { migrateHomeDocument, serializeHomeDocument } from "./migrate"

describe("migrateHomeDocument v2", () => {
  test("round-trip current v2 document", () => {
    // Given
    const page = createBlankPage({
      name: "测试",
      style: defaultPageStyle(),
    })
    const docR = buildHomeDocument({ pages: [page] })
    if (!docR.ok) throw new Error("doc")
    // When
    const raw = serializeHomeDocument(docR.value)
    const migrated = migrateHomeDocument(raw)
    // Then
    expect(migrated.ok).toBe(true)
    if (migrated.ok) {
      expect(migrated.value.schemaVersion).toBe(HOME_SCHEMA_VERSION)
      expect(migrated.value.schemaVersion).toBe(2)
      expect(migrated.value.sequence.pageIds.length).toBe(1)
      expect(migrated.value.settings.motionProfile).toBe("balanced")
    }
  })

  test("defaults typography mood when upgrading an earlier v2 document", () => {
    // Given — schema v2 existed before typographyMood was persisted
    const raw = {
      schemaVersion: 2,
      sequence: { pageIds: ["page-old"], landingPageId: "page-old" },
      pages: {
        "page-old": {
          id: "page-old",
          name: "保留页",
          icon: "旧",
          style: {
            seedPalette: {
              bg: "old-bg",
              surface: "old-surface",
              ink: "old-ink",
              muted: "old-muted",
              accent: "old-accent",
            },
            wallpaper: {
              kind: "generative",
              generativePreset: "muse",
              dim: 0.35,
            },
            glassProfile: "deep",
            glassTuning: {
              transmission: 0.1,
              blur: 3,
              saturation: -0.2,
              highlight: 0.2,
            },
          },
          widgets: [
            {
              id: "widget-old",
              source: { kind: "builtin", typeId: "builtin.clock" },
              layout: { x: 11, y: 12, w: 31, h: 32, z: 4 },
              config: { showSeconds: false },
              styleOverride: null,
            },
          ],
        },
      },
      settings: {
        rememberLastPage: true,
        allowHexagramRedraw: false,
        snapEnabled: true,
        showWidgetTitles: false,
        reducedMotion: "system",
        locale: "zh-CN",
        motionProfile: "balanced",
      },
      lastPageId: "page-old",
    }

    // When
    const migrated = migrateHomeDocument(raw)

    // Then
    expect(migrated.ok).toBe(true)
    if (!migrated.ok) throw new Error(migrated.error.message)
    const page = migrated.value.pages["page-old"]
    if (!page) throw new Error("migrated page missing")
    expect(page.style.typographyMood).toBe("sans")
    expect(page.style.wallpaper.kind).toBe("generative")
    if (page.style.wallpaper.kind !== "generative") {
      throw new Error("expected generative wallpaper")
    }
    expect(page.style.wallpaper.generativePreset).toBe("muse")
    expect(Number(page.style.wallpaper.dim)).toBe(0.35)
    expect(page.style.glassProfile).toBe("deep")
    expect(page.style.glassTuning.transmission).toBe(0.1)
    expect(page.style.glassTuning.blur).toBe(3)
    expect(page.style.glassTuning.saturation).toBe(-0.2)
    expect(page.style.glassTuning.highlight).toBe(0.2)
    expect(page.widgets).toHaveLength(1)
    const widget = page.widgets[0]
    if (!widget) throw new Error("migrated widget missing")
    expect(String(widget.id)).toBe("widget-old")
    expect(widget.source.kind).toBe("builtin")
    if (widget.source.kind !== "builtin") {
      throw new Error("expected builtin widget source")
    }
    expect(String(widget.source.typeId)).toBe("builtin.clock")
    expect(widget.layout).toEqual({ x: 11, y: 12, w: 31, h: 32, z: 4 })
    expect(widget.config).toEqual({ showSeconds: false })
    expect(widget.styleOverride).toBeNull()
  })

  test("rejects future schema as unsupported", () => {
    // Given / When
    const r = migrateHomeDocument({ schemaVersion: 99, pages: {} })
    // Then
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("unsupported")
  })

  test("v1 payload is unsupported (ADR 0010 no migration)", () => {
    // Given — classic v1 shape must not parse as Home v2
    const v1 = {
      schemaVersion: 1,
      sequence: { pageIds: ["p1"], landingPageId: "p1" },
      pages: {
        p1: {
          id: "p1",
          name: "旧页",
          icon: "旧",
          style: { packId: "caliper", overrides: {} },
          widgets: [],
        },
      },
      settings: {
        rememberLastPage: false,
        allowHexagramRedraw: false,
        snapEnabled: true,
        reducedMotion: "system",
        locale: "zh-CN",
      },
      lastPageId: null,
    }
    // When
    const r = migrateHomeDocument(v1)
    // Then
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe("unsupported")
      expect(r.error.raw).toBe(v1)
    }
  })

  test("rejects corrupt v2 sequence", () => {
    // Given
    const r = migrateHomeDocument({
      schemaVersion: 2,
      sequence: { pageIds: ["missing"], landingPageId: "missing" },
      pages: {},
      settings: {
        rememberLastPage: false,
        allowHexagramRedraw: false,
        snapEnabled: true,
        reducedMotion: "system",
        locale: "zh-CN",
        motionProfile: "balanced",
      },
      lastPageId: null,
    })
    // When / Then
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("corrupt")
  })

  test("rejects non-object", () => {
    // Given / When
    const r = migrateHomeDocument(null)
    // Then
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("parse")
  })

  test("rejects corrupt v2 wallpaper bag", () => {
    // Given — wallpaper missing kind discriminant
    const page = createBlankPage({ name: "x", style: defaultPageStyle() })
    const docR = buildHomeDocument({ pages: [page] })
    if (!docR.ok) throw new Error("doc")
    const raw = {
      ...docR.value,
      pages: {
        ...docR.value.pages,
        [page.id]: {
          ...page,
          style: {
            ...page.style,
            wallpaper: { dim: 0.2, value: "legacy-bag" },
          },
        },
      },
    }
    // When
    const r = migrateHomeDocument(raw)
    // Then
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("corrupt")
  })
})
