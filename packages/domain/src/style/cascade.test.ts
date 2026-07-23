import { describe, expect, test } from "bun:test"
import { stylePackId } from "../ids/ids"
import {
  applyOverride,
  clearPageOverrides,
  resolvePageTokens,
  resolveWidgetTokens,
  withPack,
} from "./cascade"
import type { StyleTokens } from "./types"

const base: StyleTokens = {
  color: {
    bg: "bg",
    surface: "surface",
    ink: "ink",
    muted: "muted",
    accent: "accent",
  },
  typography: {
    displayFamily: "D",
    bodyFamily: "B",
    monoFamily: "M",
    displayWeight: 400,
    bodySizePx: 14,
  },
  space: { safePct: 2, widgetGapPct: 1 },
  radius: { sm: "4px", md: "8px", lg: "16px" },
  elevation: { mode: "flat" },
  glass: { blurPx: 0, opacity: 0, highlight: 0, enabled: false },
  wallpaper: { kind: "gradient", fit: "cover", dim: 0 },
  motion: { turnMs: 400, ease: "ease" },
}

describe("Style cascade", () => {
  test("page override wins over pack", () => {
    const tokens = resolvePageTokens(base, {
      packId: stylePackId("inkstone"),
      overrides: { color: { accent: "cinnabar" } },
    })
    expect(tokens.color.accent).toBe("cinnabar")
    expect(tokens.color.bg).toBe("bg")
  })

  test("switching pack keeps overrides", () => {
    const page = {
      packId: stylePackId("inkstone"),
      overrides: { color: { accent: "kept" } },
    }
    const next = withPack(page, stylePackId("caliper"))
    expect(next.packId).toBe(stylePackId("caliper"))
    expect(next.overrides.color?.accent).toBe("kept")
  })

  test("widget inherits page unless override", () => {
    const pageTokens = applyOverride(base, { color: { ink: "page-ink" } })
    expect(resolveWidgetTokens(pageTokens, null).color.ink).toBe("page-ink")
    expect(
      resolveWidgetTokens(pageTokens, { color: { ink: "widget-ink" } }).color
        .ink,
    ).toBe("widget-ink")
  })

  test("clear overrides restores pack-only", () => {
    const page = {
      packId: stylePackId("dew-glass"),
      overrides: { glass: { enabled: false } },
    }
    const cleared = clearPageOverrides(page)
    expect(cleared.overrides).toEqual({})
  })
})
