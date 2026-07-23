import { describe, expect, test } from "bun:test"
import { migrateHomeDocument, serializeHomeDocument } from "./migrate"
import { buildHomeDocument, createBlankPage } from "../home/document"
import { stylePackId } from "../ids/ids"

describe("migrateHomeDocument", () => {
  test("round-trip current document", () => {
    const page = createBlankPage({
      name: "测试",
      style: { packId: stylePackId("caliper"), overrides: {} },
    })
    const docR = buildHomeDocument({ pages: [page] })
    if (!docR.ok) throw new Error("doc")
    const raw = serializeHomeDocument(docR.value)
    const migrated = migrateHomeDocument(raw)
    expect(migrated.ok).toBe(true)
    if (migrated.ok) {
      expect(migrated.value.schemaVersion).toBe(1)
      expect(migrated.value.sequence.pageIds.length).toBe(1)
    }
  })

  test("rejects future schema", () => {
    const r = migrateHomeDocument({ schemaVersion: 99, pages: {} })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("unsupported")
  })

  test("rejects corrupt sequence", () => {
    const r = migrateHomeDocument({
      schemaVersion: 1,
      sequence: { pageIds: ["missing"], landingPageId: "missing" },
      pages: {},
      settings: {
        rememberLastPage: false,
        allowHexagramRedraw: false,
        snapEnabled: true,
        reducedMotion: "system",
        locale: "zh-CN",
      },
      lastPageId: null,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("corrupt")
  })

  test("rejects non-object", () => {
    const r = migrateHomeDocument(null)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("parse")
  })
})
