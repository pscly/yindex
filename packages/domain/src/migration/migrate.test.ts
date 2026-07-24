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
    const raw = serializeHomeDocument(docR.value) as {
      pages: Record<string, { style: { wallpaper: unknown } }>
    }
    const firstId = Object.keys(raw.pages)[0]
    if (!firstId) throw new Error("no page")
    const pageRaw = raw.pages[firstId]
    if (!pageRaw) throw new Error("no page raw")
    pageRaw.style.wallpaper = { dim: 0.2, value: "legacy-bag" }
    // When
    const r = migrateHomeDocument(raw)
    // Then
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("corrupt")
  })
})
