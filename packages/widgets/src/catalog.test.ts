import { describe, expect, test } from "bun:test"
import * as catalog from "./catalog"

const { BUILTIN_CATALOG, catalogEntryFor } = catalog

describe("Builtin Widget catalog morphology", () => {
  test("Given the product catalog, When entries are listed, Then each type carries a fixed surface mode", () => {
    // Given / When
    const byId = Object.fromEntries(
      BUILTIN_CATALOG.map((entry) => [entry.typeId, entry]),
    )

    // Then
    expect(byId["builtin.clock"]?.surfaceMode).toBe("content-direct")
    expect(byId["builtin.quote"]?.surfaceMode).toBe("content-direct")
    expect(byId["builtin.search"]?.surfaceMode).toBe("lens")
    expect(byId["builtin.search"]?.lensShape).toBe("capsule")
    expect(byId["builtin.weather"]?.surfaceMode).toBe("lens")
    expect(byId["builtin.weather"]?.lensShape).toBe("capsule")
    expect(byId["builtin.shortcuts"]?.surfaceMode).toBe("bare")
    expect(byId["builtin.shortcuts"]?.lensShape).toBeUndefined()
    expect(byId["builtin.hexagram"]?.surfaceMode).toBe("lens")
    expect(byId["builtin.hexagram"]?.lensShape).toBe("panel")
  })

  test("Given all builtin Widget Types, When the surface contract is inspected, Then the exhaustive map fixes each product variant", () => {
    // Given / When / Then
    expect(catalog).toHaveProperty("SURFACE_VARIANT_BY_TYPE", {
      "builtin.clock": { kind: "content-direct" },
      "builtin.quote": { kind: "content-direct" },
      "builtin.weather": { kind: "lens", shape: "capsule" },
      "builtin.search": { kind: "lens", shape: "capsule" },
      "builtin.shortcuts": { kind: "bare" },
      "builtin.hexagram": { kind: "lens", shape: "panel" },
    })
  })

  test("Given a known type id, When catalogEntryFor resolves it, Then morphology metadata is present", () => {
    // Given / When
    const clock = catalogEntryFor("builtin.clock")
    const search = catalogEntryFor("builtin.search")

    // Then
    expect(clock?.surfaceMode).toBe("content-direct")
    expect(search?.lensShape).toBe("capsule")
    expect(catalogEntryFor("builtin.missing")).toBeUndefined()
  })
})
