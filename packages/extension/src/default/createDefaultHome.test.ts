import { describe, expect, test } from "bun:test"
import {
  HOME_SCHEMA_VERSION,
  migrateHomeDocument,
  serializeHomeDocument,
} from "@yindex/domain"
import { createDefaultHome } from "./createDefaultHome"

describe("createDefaultHome v2 scenes", () => {
  test("three pages 此刻 / 灵感 / 流光 with generative wallpapers", () => {
    // Given / When
    const home = createDefaultHome()
    // Then
    expect(home.schemaVersion).toBe(HOME_SCHEMA_VERSION)
    expect(home.schemaVersion).toBe(2)
    expect(home.settings.motionProfile).toBe("balanced")

    const ordered = home.sequence.pageIds.map((id) => home.pages[id])
    expect(ordered).toHaveLength(3)
    expect(ordered.map((p) => p?.name)).toEqual(["此刻", "灵感", "流光"])
    expect(home.sequence.landingPageId).toBe(ordered[0]?.id)

    const presets = ordered.map((p) => {
      const w = p?.style.wallpaper
      return w?.kind === "generative" ? w.generativePreset : null
    })
    expect(presets).toEqual(["moment", "muse", "flow"])
    expect(ordered.map((p) => p?.style.typographyMood)).toEqual([
      "sans",
      "serif",
      "sans",
    ])

    for (const p of ordered) {
      expect(p?.style.glassProfile).toBe("balanced")
    }

    // 此刻: clock, weather, search, shortcuts
    const momentTypes = (ordered[0]?.widgets ?? []).map((w) =>
      w.source.kind === "builtin" ? String(w.source.typeId) : "",
    )
    expect(momentTypes).toContain("builtin.clock")
    expect(momentTypes).toContain("builtin.weather")
    expect(momentTypes).toContain("builtin.search")
    expect(momentTypes).toContain("builtin.shortcuts")

    // 灵感: quote + hexagram
    const museTypes = (ordered[1]?.widgets ?? []).map((w) =>
      w.source.kind === "builtin" ? String(w.source.typeId) : "",
    )
    expect(museTypes).toContain("builtin.quote")
    expect(museTypes).toContain("builtin.hexagram")

    // 流光: clock only
    const flowTypes = (ordered[2]?.widgets ?? []).map((w) =>
      w.source.kind === "builtin" ? String(w.source.typeId) : "",
    )
    expect(flowTypes).toEqual(["builtin.clock"])
  })

  test("serialized default home round-trips through migrate", () => {
    // Given
    const home = createDefaultHome()
    // When
    const raw = serializeHomeDocument(home)
    const back = migrateHomeDocument(raw)
    // Then
    expect(back.ok).toBe(true)
    if (back.ok) {
      expect(back.value.schemaVersion).toBe(2)
      expect(back.value.sequence.pageIds.length).toBe(3)
    }
  })
})
